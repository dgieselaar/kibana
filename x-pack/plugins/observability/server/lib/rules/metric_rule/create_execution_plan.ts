/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValuesType, UnionToIntersection } from 'utility-types';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { mapValues, pickBy, sortBy, compact } from 'lodash';
import { ESSearchClient } from 'typings/elasticsearch';
import { RULE_UUID } from '@kbn/rule-data-utils/target/technical_field_names';
import { isInstantVector } from '../../../../common/expressions/utils';
import { parse } from '../../../../common/expressions/parser';
import { InstantVector } from '../../../../common/expressions/instant_vector';
import { LabelSet } from '../../../../common/expressions/label_set';
import { AlertSeverityLevel } from '../../../../../apm/common/alert_types';
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
import { MeasurementAlert } from './types';
import { Sample } from '../../../../common/expressions/sample';

function alertsQuery({ ruleUuid }: { ruleUuid?: string; query: AlertsDataQuery }) {
  return [
    ...(ruleUuid
      ? [
          {
            term: {
              [RULE_UUID]: ruleUuid,
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
    expression: string;
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
        return {
          name,
          type: 'expression',
          record,
          meta: {
            expression: metricConfig.expression,
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

      let start = end - parseInterval(range)!.asMilliseconds();

      const resolver = getMetricQueryResolver(meta);

      const decoded = metricQueryRt.decode(meta);
      const offsetInMs = offset ? parseInterval(offset)!.asMilliseconds() : 0;

      const timeOfMeasurement = end;

      end = end - offsetInMs;
      start = start - offsetInMs;

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
  ruleUuid,
}: {
  config: AlertingConfig;
  clusterClient: ESSearchClient;
  ruleDataClient: RuleDataClient;
  ruleUuid?: string;
}) {
  return {
    async evaluate({ time }: { time: number }) {
      const queries = 'query' in config ? [config.query] : config.queries;

      const allMetrics: Record<string, ParsedMetric> = Object.assign(
        {},
        ...queries.map((query) =>
          'alerts' in query
            ? parseMetrics({ time, query: query.alerts, step: config.step })
            : parseMetrics({ time, query, step: config.step })
        )
      );

      const expressionMetrics = pickBy(
        allMetrics,
        (metric): metric is ParsedExpressionMetric => metric.type === 'expression'
      );

      const fetchedMetricVectors: Record<string, InstantVector> = mapValues(
        allMetrics,
        () => new InstantVector(time, [])
      );

      await Promise.all(
        queries.map(async (queryConfig) => {
          const query =
            'alerts' in queryConfig
              ? {
                  ...queryConfig.alerts,
                }
              : queryConfig;

          const queryMetrics = pickBy(
            allMetrics,
            (metric): metric is ParsedQueryMetric => metric.type === 'query_over_time'
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

          await Promise.all(
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
                      ...('alerts' in queryConfig
                        ? alertsQuery({ query: queryConfig, ruleUuid })
                        : []),
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
                                size: groupConfig!.limit ?? 10000,
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

              arrayUnionToCallable(buckets).forEach((bucket) => {
                const keys = Array.isArray(bucket.key) ? bucket.key : [bucket.key as string];
                const labels = Object.fromEntries(
                  keys.map((key, index) => {
                    return [sources[index].name, key];
                  })
                );

                const labelSet = new LabelSet(labels);

                // eslint-disable-next-line guard-for-in
                for (const key in search.metrics) {
                  const fn = queryMetricResolvers[key];
                  const sample = new Sample(labelSet, fn(bucket[key as keyof typeof bucket]));
                  fetchedMetricVectors[key].push(sample);
                }
              });
            })
          );
        })
      );

      const alertDefinitions = 'alert' in config ? [config.alert] : config.alerts;

      const sortedBySeverity = sortBy(alertDefinitions, (definition) => {
        return ([AlertSeverityLevel.Critical, AlertSeverityLevel.Warning] as string[]).indexOf(
          definition.actionGroupId ?? AlertSeverityLevel.Warning
        );
      });

      const scope: Record<string, InstantVector | number | null> = { ...fetchedMetricVectors };

      // eslint-disable-next-line guard-for-in
      for (const key in expressionMetrics) {
        const parser = parse(expressionMetrics[key].meta.expression);
        scope[key] = parser.evaluate(scope) as InstantVector | number | null;
      }

      const alerts: MeasurementAlert[] = [];

      const metricsByLabelId: Record<string, Record<string, number | null>> = {};

      // eslint-disable-next-line guard-for-in
      for (const key in scope) {
        const result = scope[key];
        if (isInstantVector(result)) {
          result.samples.forEach((sample) => {
            const id = sample.sig();
            let metricsForLabelId = metricsByLabelId[id];
            if (!metricsForLabelId) {
              metricsForLabelId = {};
              Object.assign(metricsByLabelId, { [id]: metricsForLabelId });
            }
            metricsForLabelId[key] = sample.value;
          });
        }
      }

      sortedBySeverity.forEach((alertDefinition) => {
        const parser = parse(alertDefinition.expression);
        const result = parser.evaluate(scope) as InstantVector | number | null;
        const actionGroupId = alertDefinition.actionGroupId;

        if (isInstantVector(result)) {
          alerts.push(
            ...result.samples.map((sample) => {
              return {
                time: result.time,
                labels: sample.labels,
                context: metricsByLabelId[sample.labels.sig()],
                actionGroupId,
              };
            })
          );
        } else if (result) {
          alerts.push({
            time,
            actionGroupId,
            labels: new LabelSet({}),
          });
        }
      });

      return {
        evaluations: scope,
        alerts,
        record: pickBy(allMetrics, (value) => value.record),
      };
    },
  };
}

export type QueryResults = PromiseReturnType<ReturnType<typeof createExecutionPlan>['evaluate']>;
