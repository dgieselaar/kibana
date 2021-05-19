/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValuesType, UnionToIntersection } from 'utility-types';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { mapValues, flatten, pickBy, sortBy } from 'lodash';
import { ESSearchClient } from 'typings/elasticsearch';
import { RULE_UUID } from '@kbn/rule-data-utils/target/technical_field_names';
import { getFieldsFromConfig } from '../../../../common/rules/get_fields_from_config';
import { AlertSeverityLevel } from '../../../../../apm/common/alert_types';
import { expressionMath } from '../../../../common/rules/alerting_dsl/expression_math';
import { RuleDataClient } from '../../../../../../plugins/rule_registry/server';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { arrayUnionToCallable } from '../../../../common/utils/array_union_to_callable';
import {
  getMetricQueryResolver,
  QueryMetricAggregation,
} from '../../../../common/rules/alerting_dsl/metric_resolvers';
import {
  AlertingEsQuery,
  AlertsDataQuery,
  metricQueryRt,
} from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { parseInterval } from '../../../../../../../src/plugins/data/common';
import type { AlertingConfig } from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { kqlQuery, rangeQuery } from '../../../utils/queries';
import { mergeByLabels } from './merge_by_labels';
import { MeasurementAlert } from './types';

function alertsQuery({ ruleUuid, query }: { ruleUuid?: string; query: AlertsDataQuery }) {
  return [
    ...(ruleUuid
      ? [
          {
            bool: {
              must_not: [
                {
                  term: {
                    [RULE_UUID]: ruleUuid,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ];
}

interface BaseParsedMetric<TType extends string, TMeta extends Record<string, any>> {
  name: string;
  type: TType;
  record?: {
    type: 'keyword' | 'double' | 'byte';
  };
  meta: TMeta;
}

type ParsedExpressionMetric = BaseParsedMetric<
  'expression',
  {
    evaluate: (scope: Record<string, any>) => any;
  }
>;

type ParsedQueryMetric = BaseParsedMetric<
  'query_over_time',
  {
    options: Record<string, unknown>;
    range: {
      start: number;
      end: number;
      time: number;
    };
    aggregation: QueryMetricAggregation;
    evaluate: (scope: any) => any;
  }
>;

type ParsedMetric = ParsedExpressionMetric | ParsedQueryMetric;

function parseMetrics({
  query,
  time,
  step,
}: {
  query: Pick<AlertingEsQuery, 'metrics' | 'query_delay' | 'round'>;
  time: number;
  step?: string;
}) {
  return mapValues(
    query.metrics,
    (metricConfig, name): ParsedMetric => {
      const record = metricConfig.record
        ? {
            type: 'double' as const,
          }
        : undefined;

      if ('expression' in metricConfig) {
        const evalFn = expressionMath.compile(metricConfig.expression);
        return {
          name,
          type: 'expression',
          record,
          meta: {
            evaluate: evalFn.evaluate,
          },
        };
      }

      const { record: _record, ...meta } = metricConfig;

      const { range, offset } = (meta as any)[Object.keys(meta)[0]] as ValuesType<
        UnionToIntersection<typeof meta>
      >;

      let end = time - (query.query_delay ? parseInterval(query.query_delay)!.asMilliseconds() : 0);

      const stepInMs = step ? parseInterval(step)!.asMilliseconds() : 0;
      const roundInMs = query.round ? parseInterval(query.round)!.asMilliseconds() : 0;

      const round = Math.max(stepInMs, roundInMs);

      end = round ? Math.floor(end / round) * round : end;

      const start = end - parseInterval(range)!.asMilliseconds();

      const resolver = getMetricQueryResolver(meta);

      const decoded = metricQueryRt.decode(meta);
      const offsetInMs = offset ? parseInterval(offset)!.asMilliseconds() : 0;

      const timeOfMeasurement = end;

      end = end - offsetInMs;

      if (!isRight(decoded)) {
        throw new Error(PathReporter.report(decoded).join('\n'));
      }

      const aggregation = resolver.getAggregation(Object.values(decoded.right)[0] as any);

      return {
        name,
        type: 'query_over_time',
        record,
        meta: {
          aggregation,
          evaluate: resolver.resolver,
          options: Object.values(decoded.right)[0],
          range: {
            start,
            end,
            time: timeOfMeasurement,
          },
        },
      };
    }
  );
}

export function createExecutionPlan({
  config,
  clusterClient,
  ruleDataClient,
}: {
  config: AlertingConfig;
  clusterClient: ESSearchClient;
  ruleDataClient: RuleDataClient;
}) {
  return {
    async evaluate({ time }: { time: number }) {
      const queries = 'query' in config ? [config.query] : config.queries;

      const defaults = Object.fromEntries(
        getFieldsFromConfig(config).map((field) => [field, null])
      );

      const queryResults = await Promise.all(
        queries.map(async (queryConfig) => {
          const query =
            'alerts' in queryConfig
              ? {
                  ...queryConfig.alerts,
                }
              : queryConfig;

          const metrics = parseMetrics({ query, time, step: config.step });

          const expressionMetrics = pickBy(
            metrics,
            (metric): metric is ParsedExpressionMetric => metric.type === 'expression'
          );

          const queryMetrics = pickBy(
            metrics,
            (metric): metric is ParsedQueryMetric => metric.type === 'query_over_time'
          );

          const expressionResolvers = mapValues(
            expressionMetrics,
            (metric) => metric.meta.evaluate
          );
          const queryMetricResolvers = mapValues(queryMetrics, (metric) => metric.meta.evaluate);

          const searches = Object.values(queryMetrics).reduce(
            (prev, metric) => {
              const {
                meta: { range },
              } = metric;

              let searchForTimeRange = prev.find(
                (search) => search.range.start === range.start && search.range.end === range.end
              );

              if (!searchForTimeRange) {
                searchForTimeRange = { range, metrics: {} };
                prev.push(searchForTimeRange);
              }

              searchForTimeRange.metrics[metric.name] = metric;

              return prev;
            },
            [] as Array<{
              range: { start: number; end: number; time: number };
              metrics: Record<string, ParsedQueryMetric>;
            }>
          );

          const measurements = await Promise.all(
            searches.map(async (search) => {
              const aggs = mapValues(search.metrics, (metric) => {
                return metric.meta.aggregation;
              });

              const groupConfig = query.by ? { by: query.by, limit: query.limit } : undefined;

              const sources = groupConfig
                ? Object.entries(groupConfig.by).map(([name, source]) => {
                    return {
                      name,
                      source,
                    };
                  })
                : [];

              const searchRequestBody = {
                query: {
                  bool: {
                    filter: [
                      ...rangeQuery(search.range.start, search.range.end),
                      ...kqlQuery(query.filter),
                      ...('alerts' in queryConfig ? alertsQuery({ query: queryConfig }) : []),
                    ],
                  },
                },
                aggs: !sources.length
                  ? aggs
                  : {
                      groups: {
                        ...(sources.length === 1
                          ? {
                              terms: {
                                ...sources[0].source,
                                size: groupConfig!.limit,
                              },
                            }
                          : {
                              multi_terms: {
                                terms: sources.map((source) => source.source),
                                ...({
                                  size: groupConfig!.limit ?? 10000,
                                } as {}),
                              },
                            }),
                        aggs,
                      },
                    },
                size: 0,
              };

              const response = !('alerts' in queryConfig)
                ? await clusterClient.search({
                    index: queryConfig.index,
                    body: searchRequestBody,
                  })
                : await ruleDataClient.getReader().search({
                    body: searchRequestBody,
                  });

              const { aggregations } = response;

              if (!aggregations) {
                return [];
              }

              const buckets =
                'groups' in aggregations && 'buckets' in aggregations.groups
                  ? aggregations.groups.buckets
                  : [
                      {
                        key: [] as string[],
                        doc_count: 0,
                        ...aggregations,
                      },
                    ];

              return arrayUnionToCallable(buckets).map((bucket) => {
                const keys = Array.isArray(bucket.key) ? bucket.key : [bucket.key as string];
                const labels = Object.fromEntries(
                  keys.map((key, index) => {
                    return [sources[index].name, key];
                  })
                );

                const aggregatedMetrics = mapValues(search.metrics, (_, key) => {
                  const fn = queryMetricResolvers[key];
                  return fn(bucket[key as keyof typeof bucket]);
                });

                return {
                  time: search.range.time,
                  labels,
                  metrics: aggregatedMetrics,
                };
              });
            })
          );

          const searchEvaluations = mergeByLabels(flatten(measurements)).map((measurement) => {
            const scope = {
              ...defaults,
              ...measurement.labels,
              ...measurement.metrics,
            };

            const evaluatedExpressionMetrics = mapValues(expressionResolvers, (resolver, key) => {
              const value = resolver(scope);
              return isNaN(value) ? null : value;
            });

            return {
              time: measurement.time,
              labels: measurement.labels,
              metrics: {
                ...measurement.metrics,
                ...evaluatedExpressionMetrics,
              },
            };
          });

          return {
            evaluations: searchEvaluations,
            record: pickBy(
              mapValues(metrics, (metric) => metric.record),
              Boolean
            ),
          };
        })
      );

      const evaluations = mergeByLabels(flatten(queryResults.map((result) => result.evaluations)));

      const alertDefinitions = 'alert' in config ? [config.alert] : config.alerts;

      const alerts: MeasurementAlert[] = [];

      const sortedBySeverity = sortBy(alertDefinitions, (definition) => {
        return ([AlertSeverityLevel.Critical, AlertSeverityLevel.Warning] as string[]).indexOf(
          definition.actionGroupId ?? AlertSeverityLevel.Warning
        );
      });

      sortedBySeverity.forEach((alertDefinition) => {
        const evaluate = expressionMath.compile(alertDefinition.expression).evaluate;

        for (const evaluation of evaluations) {
          const result = evaluate(evaluation.metrics);
          if (result) {
            alerts.push({
              labels: evaluation.labels,
              metrics: evaluation.metrics,
              time,
              actionGroupId: alertDefinition.actionGroupId,
            });
          }
        }
      });

      return {
        evaluations,
        alerts,
        record: Object.assign({}, ...queryResults.map((result) => result.record)) as Record<
          string,
          Required<BaseParsedMetric<any, any>>['record']
        >,
      };
    },
  };
}

export type QueryResults = PromiseReturnType<ReturnType<typeof createExecutionPlan>['evaluate']>;
