/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValuesType, UnionToIntersection } from 'utility-types';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { mapValues, flatten, pickBy, uniq } from 'lodash';
import * as math from 'mathjs';
import { ESSearchClient } from 'typings/elasticsearch';
import { arrayUnionToCallable } from '../../../../common/utils/array_union_to_callable';
import {
  getMetricQueryResolver,
  QueryMetricAggregation,
} from '../../../../common/rules/alerting_dsl/metric_resolvers';
import { metricQueryRt } from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { parseInterval } from '../../../../../../../src/plugins/data/common';
import type {
  AlertingConfig,
  AlertingQuery,
} from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { kqlQuery, rangeQuery } from '../../../utils/queries';
import { mergeByLabels } from './merge_by_labels';

const relaxedMath: typeof math = math.create(math.all) as any;

(relaxedMath.typed as any).conversions.unshift({
  from: 'null',
  to: 'number',
  convert: () => 0,
});

interface BaseParsedMetric<
  TType extends string,
  TMeta extends Record<string, any>
> {
  name: string;
  type: TType;
  record?: boolean;
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
  query: AlertingQuery;
  time: number;
  step?: string;
}) {
  return mapValues(
    query.metrics,
    (metricConfig, name): ParsedMetric => {
      if ('expression' in metricConfig) {
        const evalFn = math.compile(metricConfig.expression);
        return {
          name,
          type: 'expression',
          record: metricConfig.record,
          meta: {
            evaluate: evalFn.evaluate,
          },
        };
      }

      const { record, ...meta } = metricConfig;

      const { range, offset } = (meta as any)[
        Object.keys(meta)[0]
      ] as ValuesType<UnionToIntersection<typeof meta>>;

      let end =
        time -
        (query.query_delay
          ? parseInterval(query.query_delay)!.asMilliseconds()
          : 0) -
        (offset ? parseInterval(offset)!.asMilliseconds() : 0);

      const stepInMs = step ? parseInterval(step)!.asMilliseconds() : 0;
      const roundInMs = query.round
        ? parseInterval(query.round)!.asMilliseconds()
        : 0;

      const round = Math.max(stepInMs, roundInMs);

      end = Math.floor(end / round) * round;

      const start = end - parseInterval(range)!.asMilliseconds();

      const resolver = getMetricQueryResolver(meta);

      const decoded = metricQueryRt.decode(meta);

      if (!isRight(decoded)) {
        throw new Error(PathReporter.report(decoded).join('\n'));
      }

      const aggregation = resolver.getAggregation(
        Object.values(decoded.right)[0] as any
      );

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
          },
        },
      };
    }
  );
}

export function createExecutionPlan({
  config,
  clusterClient,
}: {
  config: AlertingConfig;
  clusterClient: ESSearchClient;
}) {
  return {
    async evaluate({ time }: { time: number }) {
      const queries = 'query' in config ? [config.query] : config.queries;

      const queryResults = await Promise.all(
        queries.map(async (query) => {
          const metrics = parseMetrics({ query, time, step: config.step });

          const expressionMetrics = pickBy(
            metrics,
            (metric): metric is ParsedExpressionMetric =>
              metric.type === 'expression'
          );

          const queryMetrics = pickBy(
            metrics,
            (metric): metric is ParsedQueryMetric =>
              metric.type === 'query_over_time'
          );

          const expressionResolvers = mapValues(
            expressionMetrics,
            (metric) => metric.meta.evaluate
          );
          const queryMetricResolvers = mapValues(
            queryMetrics,
            (metric) => metric.meta.evaluate
          );

          const searches = Object.values(queryMetrics).reduce(
            (prev, metric) => {
              const {
                meta: { range },
              } = metric;

              let searchForTimeRange = prev.find(
                (search) =>
                  search.range.start === range.start &&
                  search.range.end === range.end
              );

              if (!searchForTimeRange) {
                searchForTimeRange = { range, metrics: {} };
                prev.push(searchForTimeRange);
              }

              searchForTimeRange.metrics[metric.name] = metric;

              return prev;
            },
            [] as Array<{
              range: { start: number; end: number };
              metrics: Record<string, ParsedQueryMetric>;
            }>
          );

          const measurements = await Promise.all(
            searches.map(async (search) => {
              const aggs = mapValues(search.metrics, (metric) => {
                return metric.meta.aggregation;
              });

              const groupConfig = query.by
                ? { by: query.by, limit: query.limit }
                : undefined;

              const sources = groupConfig
                ? Object.entries(groupConfig.by).map(([name, source]) => {
                    return {
                      name,
                      source,
                    };
                  })
                : [];

              const response = await clusterClient.search({
                index: query.index,
                body: {
                  query: {
                    bool: {
                      filter: [
                        ...rangeQuery(search.range.start, search.range.end),
                        ...kqlQuery(query.filter),
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
                },
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
                const keys = Array.isArray(bucket.key)
                  ? bucket.key
                  : [bucket.key as string];
                const labels = Object.fromEntries(
                  keys.map((key, index) => {
                    return [sources[index].name, key];
                  })
                );

                const aggregatedMetrics = mapValues(
                  queryMetricResolvers,
                  (fn, key) => {
                    return fn(bucket[key as keyof typeof bucket]);
                  }
                );

                return {
                  time,
                  labels,
                  metrics: aggregatedMetrics,
                };
              });
            })
          );

          const searchEvaluations = mergeByLabels(flatten(measurements)).map(
            (measurement) => {
              const scope = {
                ...measurement.labels,
                ...measurement.metrics,
              };

              const evaluatedExpressionMetrics = mapValues(
                expressionResolvers,
                (resolver, key) => {
                  return resolver(scope);
                }
              );
              return {
                time: measurement.time,
                labels: measurement.labels,
                metrics: {
                  ...measurement.metrics,
                  ...evaluatedExpressionMetrics,
                },
              };
            }
          );

          return {
            evaluations: searchEvaluations,
            record: Object.keys(pickBy(metrics, (metric) => !!metric.record)),
          };
        })
      );

      return {
        evaluations: mergeByLabels(
          flatten(queryResults.map((result) => result.evaluations))
        ),
        record: uniq(flatten(queryResults.map((result) => result.record))),
      };
    },
  };
}
