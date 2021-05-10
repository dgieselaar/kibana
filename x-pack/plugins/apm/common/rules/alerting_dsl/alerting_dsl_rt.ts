/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { UnionToIntersection } from 'utility-types';
import { durationRt } from '../duration_rt';
import { kqlRt } from '../kql_rt';
import {
  avgOverTime,
  countOverTime,
  sumOverTime,
  minOverTime,
  maxOverTime,
} from './metric_resolvers';

const alertRt = t.type({});

const metricQueryRt = t.union(
  [
    avgOverTime.type,
    countOverTime.type,
    sumOverTime.type,
    minOverTime.type,
    maxOverTime.type,
  ],
  'metric_query'
);

const metricExpressionRt = t.type(
  {
    expression: t.string,
  },
  'metric_expression'
);

const metricRt = t.intersection([
  t.partial({
    record: t.boolean,
  }),
  t.union([metricQueryRt, metricExpressionRt]),
]);

const metricContainerRt = t.record(t.string, metricRt);

const groupingRt = t.type(
  {
    by: t.record(
      t.string,
      t.type({
        field: t.string,
      }),
      'by'
    ),
    limit: t.number,
  },
  'grouping'
);

const runtimeMappingsRt = t.record(
  t.string,
  t.intersection([
    t.type({
      type: t.string,
    }),
    t.partial({
      script: t.type({
        source: t.string,
      }),
    }),
  ]),
  'runtime_mappings'
);

const queryRt = t.intersection(
  [
    t.union([groupingRt, t.strict({})]),
    t.type({
      index: t.union([t.string, t.array(t.string)]),
      metrics: metricContainerRt,
    }),
    t.partial({
      filter: kqlRt,
      round: durationRt,
      runtime_mappings: runtimeMappingsRt,
      query_delay: durationRt,
    }),
  ],
  'query'
);

const configRt = t.intersection(
  [
    t.type({
      alert: alertRt,
    }),
    t.partial({
      step: durationRt,
    }),
    t.union([
      t.type({ query: queryRt }),
      t.type({ queries: t.array(queryRt) }),
    ]),
  ],
  'config'
);

export { configRt, metricQueryRt };

export type AlertingConfig = t.TypeOf<typeof configRt>;
export type MetricQueryContainer = t.TypeOf<typeof metricQueryRt>;

export type AlertingQuery = t.TypeOf<typeof queryRt>;
export type MetricQueryType = keyof UnionToIntersection<MetricQueryContainer>;
