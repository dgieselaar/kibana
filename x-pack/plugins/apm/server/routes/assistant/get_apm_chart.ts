/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import * as t from 'io-ts';
import { SubAggregateOf } from '@kbn/es-types/src/search';
import Mustache from 'mustache';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { ApmDocumentType } from '../../../common/document_type';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { RollupInterval } from '../../../common/rollup';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getOutcomeAggregation } from '../../lib/helpers/transaction_error_rate';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  SPAN_DURATION,
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../common/es_fields/apm';
import { getLatencyAggregation } from '../../lib/helpers/latency_aggregation_type';
import { termQuery } from '../../../common/utils/term_query';
import { EventOutcome } from '../../../common/event_outcome';

enum ApmChartMetricType {
  transactionThroughput = 'transaction_throughput',
  transactionLatency = 'transaction_latency',
  transactionFailureRate = 'transaction_failure_rate',
  exitSpanThroughput = 'exit_span_throughput',
  exitSpanLatency = 'exit_span_latency',
  exitSpanFailureRate = 'exit_span_failure_rate',
  errorEventRate = 'error_event_rate',
}

export const getApmChartArgsRt = t.type({
  stats: t.array(
    t.intersection([
      t.type({
        'service.name': t.string,
        metric: t.union([
          t.type({
            name: t.union([
              t.literal(ApmChartMetricType.transactionThroughput),
              t.literal(ApmChartMetricType.transactionFailureRate),
              t.literal(ApmChartMetricType.exitSpanThroughput),
              t.literal(ApmChartMetricType.exitSpanFailureRate),
              t.literal(ApmChartMetricType.errorEventRate),
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
        label: t.string,
      }),
      t.partial({
        filter: t.string,
        groupBy: t.string,
      }),
    ])
  ),
});

export async function getAssistantApmChart({
  now,
  args,
  apmEventClient,
}: {
  now: number;
  args: t.TypeOf<typeof getApmChartArgsRt>;
  apmEventClient: APMEventClient;
}) {
  const forceNow = new Date(now);

  interface ChangePointResult {
    bucket?: {
      key: string;
    };
    type: Record<
      string,
      {
        change_point?: number;
        r_value?: number;
        trend?: string;
        p_value: number;
      }
    >;
  }

  const allSeries = (
    await Promise.all(
      args.stats.map(async (stat) => {
        const start = datemath.parse(stat.start)?.valueOf()!;
        const end = datemath.parse(stat.end, { forceNow })?.valueOf()!;

        async function fetchSeries<
          T extends Record<'value', AggregationsAggregationContainer>
        >({
          operationName,
          documentType,
          rollupInterval,
          aggs,
          unit,
        }: {
          operationName: string;
          documentType: ApmDocumentType;
          rollupInterval: RollupInterval;
          aggs: T;
          unit: 'ms' | 'rpm' | '%';
        }): Promise<
          Array<{
            groupBy?: Record<string, string>;
            data: Array<
              {
                key: number;
                key_as_string: string;
                doc_count: number;
              } & SubAggregateOf<{ aggs: T }, unknown>
            >;
            change_point: ChangePointResult;
            value: number | null;
            unit: string;
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
                    ...termQuery(SERVICE_NAME, stat['service.name']),
                  ],
                },
              },
              aggs: {
                groupBy: {
                  ...(stat.groupBy
                    ? {
                        terms: {
                          field: stat.groupBy,
                          size: 20,
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
              ...(stat.groupBy
                ? {
                    groupBy: {
                      [stat.groupBy]:
                        bucket.key_as_string || String(bucket.key),
                    },
                  }
                : {}),
              data: bucket.timeseries.buckets,
              value:
                bucket.value?.value === undefined ||
                bucket.value?.value === null
                  ? null
                  : Math.round(bucket.value.value),
              change_point: bucket.change_points,
              unit,
            };
          });
        }

        let fetchedSeries: Array<{
          groupBy?: Record<string, string>;
          data: Array<{ x: number; y: number | null }>;
          change_point: ChangePointResult;
          value: number | null;
          unit: string;
        }>;

        const useMetrics = end - start > 1000 * 60 * 30;

        const { bucketSize, intervalString } = getBucketSize({
          start,
          end,
          numBuckets: 100,
          minBucketSize: useMetrics ? 60 : 0,
        });

        const bucketSizeInMinutes = bucketSize / 60;
        const rangeInMinutes = (end - start) / 1000 / 60;

        const transactionParams = useMetrics
          ? {
              documentType: ApmDocumentType.TransactionMetric,
              rollupInterval: RollupInterval.OneMinute,
            }
          : {
              documentType: ApmDocumentType.TransactionEvent,
              rollupInterval: RollupInterval.None,
            };

        const spanParams = useMetrics
          ? {
              documentType: ApmDocumentType.ServiceDestinationMetric,
              rollupInterval: RollupInterval.OneMinute,
            }
          : {
              documentType: ApmDocumentType.ExitSpanEvent,
              rollupInterval: RollupInterval.None,
            };

        switch (stat.metric.name) {
          case ApmChartMetricType.transactionLatency:
            {
              fetchedSeries = (
                await fetchSeries({
                  operationName: 'get_transaction_latency',
                  ...transactionParams,
                  unit: 'ms',
                  aggs: {
                    ...getLatencyAggregation(
                      stat.metric.function,
                      useMetrics
                        ? TRANSACTION_DURATION_HISTOGRAM
                        : TRANSACTION_DURATION
                    ),
                    value: {
                      bucket_script: {
                        buckets_path: {
                          latency: 'latency',
                        },
                        script: 'params.latency / 1000',
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
                  ...transactionParams,
                  unit: 'rpm',
                  aggs: {
                    value: {
                      bucket_script: {
                        buckets_path: {
                          count: '_count',
                        },
                        script: {
                          lang: 'painless',
                          params: {
                            bucketSizeInMinutes,
                          },
                          source: 'params.count / params.bucketSizeInMinutes',
                        },
                      },
                    },
                  },
                })
              ).map((fetchedSerie) => {
                return {
                  ...fetchedSerie,
                  value:
                    fetchedSerie.value !== null
                      ? fetchedSerie.value / rangeInMinutes
                      : null,
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
                  ...transactionParams,
                  unit: '%',
                  aggs: {
                    ...getOutcomeAggregation(transactionParams.documentType),
                    value: {
                      bucket_script: {
                        buckets_path: {
                          successful_or_failed: 'successful_or_failed>_count',
                          successful: 'successful>_count',
                        },
                        script:
                          '100 * (1 - (params.successful / params.successful_or_failed))',
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
                ...spanParams,
                unit: 'rpm',
                aggs: {
                  ...(useMetrics
                    ? {
                        count: {
                          sum: {
                            field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                          },
                        },
                      }
                    : {}),
                  value: {
                    bucket_script: {
                      buckets_path: {
                        count: useMetrics ? 'count' : '_count',
                      },
                      script: {
                        lang: 'painless',
                        params: {
                          bucketSizeInMinutes,
                        },
                        source: 'params.count / params.bucketSizeInMinutes',
                      },
                    },
                  },
                },
              })
            ).map((fetchedSerie) => {
              return {
                ...fetchedSerie,
                value:
                  fetchedSerie.value !== null
                    ? fetchedSerie.value / rangeInMinutes
                    : null,
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
                  ...spanParams,
                  unit: 'ms',
                  aggs: {
                    ...(useMetrics
                      ? {
                          count: {
                            sum: {
                              field:
                                SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                            },
                          },
                        }
                      : {}),
                    latency: {
                      sum: {
                        field: useMetrics
                          ? SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM
                          : SPAN_DURATION,
                      },
                    },
                    value: {
                      bucket_script: {
                        buckets_path: {
                          latency: 'latency',
                          count: useMetrics ? 'count' : '_count',
                        },
                        script: '(params.latency / params.count) / 1000',
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
                  ...spanParams,
                  unit: '%',
                  aggs: {
                    successful: {
                      filter: {
                        terms: {
                          [EVENT_OUTCOME]: [EventOutcome.success],
                        },
                      },
                      aggs: useMetrics
                        ? {
                            count: {
                              sum: {
                                field:
                                  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                              },
                            },
                          }
                        : {},
                    },
                    successful_or_failed: {
                      filter: {
                        terms: {
                          [EVENT_OUTCOME]: [
                            EventOutcome.success,
                            EventOutcome.failure,
                          ],
                        },
                      },
                      aggs: useMetrics
                        ? {
                            count: {
                              sum: {
                                field:
                                  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                              },
                            },
                          }
                        : {},
                    },
                    value: {
                      bucket_script: {
                        buckets_path: {
                          successful_or_failed: `successful_or_failed>${
                            useMetrics ? 'count' : '_count'
                          }`,
                          successful: `successful>${
                            useMetrics ? 'count' : '_count'
                          }`,
                        },
                        script:
                          '100 * (1 - (params.successful / params.successful_or_failed))',
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

          case ApmChartMetricType.errorEventRate:
            {
              fetchedSeries = (
                await fetchSeries({
                  operationName: 'get_error_throughput',
                  documentType: ApmDocumentType.ErrorEvent,
                  rollupInterval: RollupInterval.None,
                  unit: 'rpm',
                  aggs: {
                    value: {
                      bucket_script: {
                        buckets_path: {
                          count: '_count',
                        },
                        script: {
                          lang: 'painless',
                          params: {
                            bucketSizeInMinutes,
                          },
                          source: 'params.count / params.bucketSizeInMinutes',
                        },
                      },
                    },
                  },
                })
              ).map((fetchedSerie) => {
                return {
                  ...fetchedSerie,
                  value:
                    fetchedSerie.value !== null
                      ? fetchedSerie.value / rangeInMinutes
                      : null,
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
        }

        return fetchedSeries.map((fetchedSerie) => {
          const changePointType = Object.keys(
            fetchedSerie.change_point?.type ?? {}
          )?.[0];

          return {
            groupBy: fetchedSerie.groupBy,
            data: fetchedSerie.data,
            value: fetchedSerie.value,
            start,
            end,
            unit: fetchedSerie.unit,
            label: Mustache.render(stat.label, {
              groupBy: fetchedSerie.groupBy,
            }),
            changes: [
              ...(changePointType && changePointType !== 'indeterminable'
                ? [
                    {
                      date: fetchedSerie.change_point.bucket?.key,
                      type: changePointType,
                      ...fetchedSerie.change_point.type[changePointType],
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
      charts: [{ series: allSeries }],
    },
  };
}
