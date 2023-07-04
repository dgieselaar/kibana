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
import { SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM } from '@kbn/observability-shared-plugin/common';
import * as t from 'io-ts';
import Mustache from 'mustache';
import { ApmDocumentType } from '../../../common/document_type';
import {
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { RollupInterval } from '../../../common/rollup';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { isFiniteNumber } from '../../../common/utils/is_finite_number';
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
  description: t.string,
  stats: t.array(
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
/* eslint-disable @typescript-eslint/explicit-function-return-type*/
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
        args.stats.map(async (stat) => {
          const start = dateMath.parse(stat.start)?.valueOf()!;
          const end = dateMath.parse(stat.end, { forceNow })?.valueOf()!;

          const { bucketSize, intervalString } = getBucketSize({
            start,
            end,
            numBuckets: 100,
            minBucketSize: 60,
          });

          async function fetchSeries<
            T extends Record<'value', AggregationsAggregationContainer>
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
              change_points: {
                bucket: {
                  key: string;
                };
                type: Record<string, { change_point: number; p_value: number }>;
              };
              value: number | null;
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
                      ...kqlQuery(stat.filter ?? ''),
                      ...rangeQuery(start, end),
                    ],
                  },
                },
                aggs: {
                  groupBy: {
                    ...(stat.groupBy
                      ? {
                          terms: {
                            field: stat.groupBy,
                          },
                        }
                      : {
                          terms: {
                            field: 'non_existing_field',
                            missing: '',
                          },
                        }),
                    aggs: {
                      ...aggs,
                      timeseries: {
                        date_histogram: {
                          field: '@timestamp',
                          fixed_interval: intervalString,
                          min_doc_count: 0,
                          extended_bounds: { min: start, max: end },
                        },
                        aggs,
                      },
                      change_points: {
                        change_point: {
                          buckets_path: 'timeseries>value',
                        },
                      },
                    },
                  },
                },
              },
            });

            if (!response.aggregations?.groupBy) {
              return [];
            }

            return response.aggregations.groupBy.buckets.map((bucket) => {
              return {
                groupBy: bucket.key_as_string || String(bucket.key),
                data: bucket.timeseries.buckets,
                value: bucket.value?.value ?? null,
                change_points: bucket.change_points,
              };
            });
          }

          let fetchedSeries: Array<{
            groupBy?: string;
            data: Array<{ x: number; y: number | null }>;
            change_points: {
              bucket: {
                key: string;
              };
              type: Record<string, { change_point: number; p_value: number }>;
            };
            value: number | null;
          }>;

          switch (stat.metric.name) {
            case ApmChartMetricType.transactionLatency:
              {
                fetchedSeries = (
                  await fetchSeries({
                    operationName: 'get_transaction_latency',
                    documentType: ApmDocumentType.TransactionMetric,
                    rollupInterval: RollupInterval.OneMinute,
                    aggs: {
                      ...getLatencyAggregation(
                        stat.metric.function,
                        TRANSACTION_DURATION_HISTOGRAM
                      ),
                      value: {
                        bucket_script: {
                          buckets_path: {
                            latency: 'latency',
                          },
                          script: 'params.latency',
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
                        y: bucket.value?.value as number | null,
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
                    aggs: {
                      value: {
                        rate: {
                          unit: 'minute',
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
                        y: bucket.value?.value as number,
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
                    aggs: {
                      ...getOutcomeAggregation(
                        ApmDocumentType.ServiceTransactionMetric
                      ),
                      value: {
                        bucket_script: {
                          buckets_path: {
                            successful_or_failed: 'successful_or_failed',
                            successful: 'successful',
                          },
                          script:
                            'params.successful / params.successful_or_failed',
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
                        y: bucket.value?.value as number | null,
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
                    value: {
                      rate: {
                        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                        unit: 'minute',
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
                      y: bucket.value?.value as number | null,
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
                      value: {
                        bucket_script: {
                          buckets_path: {
                            total_latency: 'latency',
                            total_count: 'count',
                          },
                          script: 'params.latency / params.count',
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
                        y: bucket.value?.value as number | null,
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
                    aggs: {
                      ...getOutcomeAggregation(
                        ApmDocumentType.ServiceDestinationMetric
                      ),
                      value: {
                        bucket_script: {
                          buckets_path: {
                            successful_or_failed: 'successful_or_failed>_count',
                            successful: 'successful>_count',
                          },
                          script:
                            'params.successful / params.successful_or_failed',
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
                        y: bucket.value?.value as number | null,
                      };
                    }),
                  };
                });
              }
              break;
          }

          return fetchedSeries.map((fetchedSerie) => {
            const changePointType = Object.keys(
              fetchedSerie.change_points?.type ?? {}
            )?.[0];

            return {
              label: Mustache.render(stat.label, {
                groupBy: fetchedSerie.groupBy,
              }),
              data: fetchedSerie.data,
              value: fetchedSerie.value,
              start,
              end,
              changes: [
                ...(changePointType
                  ? [
                      {
                        date: fetchedSerie.change_points.bucket.key,
                        type: changePointType,
                        p_value:
                          fetchedSerie.change_points.type[changePointType]
                            .p_value,
                        change_point:
                          fetchedSerie.change_points.type[changePointType]
                            .change_point,
                      },
                    ]
                  : []),
              ],
            };
          });
        })
      )
    ).flat();

    return {
      content: JSON.stringify(
        allSeries.map((series) => {
          const { start, end, data, ...rest } = series;
          return {
            ...rest,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
          };
        })
      ),
      data: {
        charts: [{ title: args.title, series: allSeries }],
      },
    };
  },
});

/* eslint-enable @typescript-eslint/explicit-function-return-type */

export const assistantRouteRepository = {
  ...assistentGetApmChartRoute,
};
