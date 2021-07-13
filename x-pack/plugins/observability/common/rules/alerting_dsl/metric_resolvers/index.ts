/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregationContainer, QueryContainer } from '@elastic/elasticsearch/api/types';
import * as t from 'io-ts';
import { kqlQuery } from '../../../../../observability/common/utils/queries';
import { durationRt } from '../../duration_rt';
import { kqlRt } from '../../kql_rt';
import { createMetricQueryResolver } from './create_metric_query_resolver';

const aggOverTimeOptionsRt = t.intersection([
  t.type({
    range: durationRt,
    field: t.string,
  }),
  t.partial({
    filter: kqlRt,
    offset: durationRt,
  }),
]);

function withFilterAggregation<
  TFilter extends string | undefined,
  TAggregation extends AggregationContainer | undefined
>(
  filter?: TFilter,
  aggregation?: TAggregation
): { filter: QueryContainer; aggs?: { metric: TAggregation } } {
  const wrappedAggs = aggregation ? { aggs: { metric: aggregation } } : {};
  return {
    filter: {
      bool: {
        filter: kqlQuery(filter),
      },
    },
    ...wrappedAggs,
  };
}

export const avgOverTime = createMetricQueryResolver()
  .setType(t.type({ avg_over_time: aggOverTimeOptionsRt }, 'avg_over_time'))
  .setAggregationFactory((options) => {
    return withFilterAggregation(options.filter, {
      avg: {
        field: options.field,
      },
    });
  })
  .setResolver((response) => {
    return response.metric.value;
  })
  .get();

export const minOverTime = createMetricQueryResolver()
  .setType(t.type({ min_over_time: aggOverTimeOptionsRt }, 'min_over_time'))
  .setAggregationFactory((options) => {
    return withFilterAggregation(options.filter, {
      min: {
        field: options.field,
      },
    });
  })
  .setResolver((response) => {
    return response.metric.value;
  })
  .get();

export const maxOverTime = createMetricQueryResolver()
  .setType(t.type({ max_over_time: aggOverTimeOptionsRt }, 'max_over_time'))
  .setAggregationFactory((options) => {
    return withFilterAggregation(options.filter, {
      min: {
        field: options.field,
      },
    });
  })
  .setResolver((response) => {
    return response.metric.value;
  })
  .get();

export const sumOverTime = createMetricQueryResolver()
  .setType(t.type({ sum_over_time: aggOverTimeOptionsRt }, 'sum_over_time'))
  .setAggregationFactory((options) => {
    return withFilterAggregation(options.filter, {
      sum: {
        field: options.field,
      },
    });
  })
  .setResolver((response) => {
    return response.metric.value;
  })
  .get();

export const countOverTime = createMetricQueryResolver()
  .setType(
    t.type(
      {
        count_over_time: t.intersection([
          t.type({
            range: durationRt,
          }),
          t.partial({
            field: t.string,
            filter: kqlRt,
            offset: durationRt,
          }),
        ]),
      },
      'count_over_time'
    )
  )
  .setAggregationFactory((options) => {
    return withFilterAggregation(
      options.filter,
      options.field
        ? {
            value_count: { field: options.field },
          }
        : undefined
    );
  })
  .setResolver((response) => {
    return response.metric?.value ?? response.doc_count;
  })
  .get();

export function getMetricQueryResolver(meta: unknown) {
  if (avgOverTime.type.is(meta)) {
    return avgOverTime;
  }

  if (countOverTime.type.is(meta)) {
    return countOverTime;
  }

  if (sumOverTime.type.is(meta)) {
    return sumOverTime;
  }

  if (minOverTime.type.is(meta)) {
    return minOverTime;
  }

  if (maxOverTime.type.is(meta)) {
    return maxOverTime;
  }

  throw new Error(`Unsupported metric query type ${Object.keys(meta as any)[0]}`);
}

export type QueryMetricAggregation = ReturnType<
  ReturnType<typeof getMetricQueryResolver>['getAggregation']
>;
