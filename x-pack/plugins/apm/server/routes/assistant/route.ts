/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dateMath from '@elastic/datemath';
import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { SubAggregateOf } from '@kbn/es-types/src/search';
import { toNumberRt } from '@kbn/io-ts-utils';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import * as t from 'io-ts';
import Mustache from 'mustache';
import { SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM } from '@kbn/observability-shared-plugin/common';
import { ApmDocumentType } from '../../../common/document_type';
import {
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { RollupInterval } from '../../../common/rollup';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { calculateThroughputWithInterval } from '../../lib/helpers/calculate_throughput';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../lib/helpers/latency_aggregation_type';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../lib/helpers/transaction_error_rate';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { isFiniteNumber } from '../../../common/utils/is_finite_number';

enum ApmChartMetricType {
  transactionThroughput = 'transaction_throughput',
  transactionLatency = 'transaction_latency',
  transactionFailureRate = 'transaction_failure_rate',
  exitSpanThroughput = 'exit_span_throughput',
  exitSpanLatency = 'exit_span_latency',
  exitSpanFailureRate = 'exit_span_failure_rate',
}

const getApmChartArgsRt = t.type({
  title: t.string,
  series: t.array(
    t.intersection([
      t.type({
        label: t.string,
        metric: t.union([
          t.type({
            name: t.union([
              t.literal(ApmChartMetricType.transactionThroughput),
              t.literal(ApmChartMetricType.transactionFailureRate),
              t.literal(ApmChartMetricType.exitSpanThroughput),
              t.literal(ApmChartMetricType.exitSpanFailureRate),
            ]),
          }),
          t.type({
            name: t.union([
              t.literal(ApmChartMetricType.transactionLatency),
              t.literal(ApmChartMetricType.exitSpanLatency),
            ]),
            function: t.union([
              t.literal(LatencyAggregationType.avg),
              t.literal(LatencyAggregationType.p95),
              t.literal(LatencyAggregationType.p99),
            ]),
          }),
        ]),
        start: t.string,
        end: t.string,
      }),
      t.partial({
        filter: t.string,
        groupBy: t.string,
      }),
    ])
  ),
});

const assistentGetApmChartRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_apm_chart',
  params: t.type({
    body: t.type({
      now: toNumberRt,
      args: getApmChartArgsRt,
    }),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{}> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const {
      body: { now, args },
    } = params;

    const forceNow = new Date(now);

    const allSeries = (
      await Promise.all(
        args.series.map(async (serie) => {
          const start = dateMath.parse(serie.start)?.valueOf()!;
          const end = dateMath.parse(serie.end, { forceNow })?.valueOf()!;

          const { bucketSize, intervalString } = getBucketSize({
            start,
            end,
            numBuckets: 100,
            minBucketSize: 60,
          });

          async function fetchSeries<
            T extends Record<string, AggregationsAggregationContainer>
          >({
            operationName,
            documentType,
            rollupInterval,
            aggs,
          }: {
            operationName: string;
            documentType: ApmDocumentType;
            rollupInterval: RollupInterval;
            aggs: T;
          }): Promise<
            Array<{
              groupBy?: string;
              data: Array<
                {
                  key: number;
                  key_as_string: string;
                  doc_count: number;
                } & SubAggregateOf<{ aggs: T }, unknown>
              >;
            }>
          > {
            const response = await apmEventClient.search(operationName, {
              apm: {
                sources: [{ documentType, rollupInterval }],
              },
              body: {
                size: 0,
                track_total_hits: false,
                query: {
                  bool: {
                    filter: [
                      ...kqlQuery(serie.filter ?? ''),
                      ...rangeQuery(start, end),
                    ],
                  },
                },
                aggs: {
                  groupBy: {
                    ...(serie.groupBy
                      ? {
                          terms: {
                            field: serie.groupBy,
                          },
                        }
                      : {
                          filter: {
                            bool: {
                              filter: [],
                            },
                          },
                        }),
                    aggs: {
                      timeseries: {
                        date_histogram: {
                          field: '@timestamp',
                          fixed_interval: intervalString,
                          min_doc_count: 0,
                          extended_bounds: { min: start, max: end },
                        },
                        aggs,
                      },
                    },
                  },
                },
              },
            });

            if (!response.aggregations?.groupBy) {
              return [];
            }

            if ('buckets' in response.aggregations.groupBy) {
              return response.aggregations.groupBy.buckets.map((bucket) => {
                return {
                  groupBy: bucket.key_as_string || String(bucket.key),
                  data: bucket.timeseries.buckets,
                };
              });
            }

            return [
              {
                data: response.aggregations.groupBy.timeseries.buckets,
              },
            ];
          }

          let fetchedSeries: Array<{
            groupBy?: string;
            data: Array<{ x: number; y: number | null }>;
          }>;

          switch (serie.metric.name) {
            case ApmChartMetricType.transactionLatency:
              {
                const fn = serie.metric.function;
                fetchedSeries = (
                  await fetchSeries({
                    operationName: 'get_transaction_latency',
                    documentType: ApmDocumentType.TransactionMetric,
                    rollupInterval: RollupInterval.OneMinute,
                    aggs: getLatencyAggregation(
                      serie.metric.function,
                      TRANSACTION_DURATION_HISTOGRAM
                    ),
                  })
                ).map((fetchedSerie) => {
                  return {
                    ...fetchedSerie,
                    data: fetchedSerie.data.map((bucket) => {
                      return {
                        x: bucket.key,
                        y: getLatencyValue({
                          latencyAggregationType: fn,
                          aggregation: bucket.latency,
                        }),
                      };
                    }),
                  };
                });
              }
              break;

            case ApmChartMetricType.transactionThroughput:
              {
                fetchedSeries = (
                  await fetchSeries({
                    operationName: 'get_transaction_throughput',
                    documentType: ApmDocumentType.TransactionMetric,
                    rollupInterval: RollupInterval.OneMinute,
                    aggs: {},
                  })
                ).map((fetchedSerie) => {
                  return {
                    ...fetchedSerie,
                    data: fetchedSerie.data.map((bucket) => {
                      return {
                        x: bucket.key,
                        y: calculateThroughputWithInterval({
                          bucketSize,
                          value: bucket.doc_count,
                        }),
                      };
                    }),
                  };
                });
              }
              break;

            case ApmChartMetricType.transactionFailureRate:
              {
                fetchedSeries = (
                  await fetchSeries({
                    operationName: 'get_transaction_failure_rate',
                    documentType: ApmDocumentType.TransactionMetric,
                    rollupInterval: RollupInterval.OneMinute,
                    aggs: getOutcomeAggregation(
                      ApmDocumentType.ServiceTransactionMetric
                    ),
                  })
                ).map((fetchedSerie) => {
                  return {
                    ...fetchedSerie,
                    data: fetchedSerie.data.map((bucket) => {
                      return {
                        x: bucket.key,
                        y: calculateFailedTransactionRate(bucket),
                      };
                    }),
                  };
                });
              }
              break;

            case ApmChartMetricType.exitSpanThroughput:
              fetchedSeries = (
                await fetchSeries({
                  operationName: 'get_exit_span_throughput',
                  documentType: ApmDocumentType.ServiceDestinationMetric,
                  rollupInterval: RollupInterval.OneMinute,
                  aggs: {
                    count: {
                      sum: {
                        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                      },
                    },
                  },
                })
              ).map((fetchedSerie) => {
                return {
                  ...fetchedSerie,
                  data: fetchedSerie.data.map((bucket) => {
                    return {
                      x: bucket.key,
                      y: calculateThroughputWithInterval({
                        bucketSize,
                        value: bucket.count.value ?? 0,
                      }),
                    };
                  }),
                };
              });
              break;

            case ApmChartMetricType.exitSpanLatency:
              {
                fetchedSeries = (
                  await fetchSeries({
                    operationName: 'get_exit_span_latency',
                    documentType: ApmDocumentType.ServiceDestinationMetric,
                    rollupInterval: RollupInterval.OneMinute,
                    aggs: {
                      count: {
                        sum: {
                          field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                        },
                      },
                      latency: {
                        sum: {
                          field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
                        },
                      },
                    },
                  })
                ).map((fetchedSerie) => {
                  return {
                    ...fetchedSerie,
                    data: fetchedSerie.data.map((bucket) => {
                      return {
                        x: bucket.key,
                        y: isFiniteNumber(bucket.latency.value)
                          ? bucket.latency.value / (bucket.count.value ?? 0)
                          : null,
                      };
                    }),
                  };
                });
              }
              break;
            case ApmChartMetricType.exitSpanFailureRate:
              {
                fetchedSeries = (
                  await fetchSeries({
                    operationName: 'exit_span_failure_rate',
                    documentType: ApmDocumentType.ServiceDestinationMetric,
                    rollupInterval: RollupInterval.OneMinute,
                    aggs: getOutcomeAggregation(
                      ApmDocumentType.ServiceDestinationMetric
                    ),
                  })
                ).map((fetchedSerie) => {
                  return {
                    ...fetchedSerie,
                    data: fetchedSerie.data.map((bucket) => {
                      return {
                        x: bucket.key,
                        y: calculateFailedTransactionRate(bucket),
                      };
                    }),
                  };
                });
              }
              break;
          }

          return fetchedSeries.map((fetchedSerie) => {
            return {
              label: Mustache.render(serie.label, {
                groupBy: fetchedSerie.groupBy,
              }),
              data: fetchedSerie.data,
              start,
              end,
            };
          });
        })
      )
    ).flat();

    return {
      title: args.title,
      series: allSeries,
    };
  },
});

export const assistantRouteRepository = {
  ...assistentGetApmChartRoute,
};
