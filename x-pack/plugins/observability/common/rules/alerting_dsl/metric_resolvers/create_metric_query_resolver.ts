/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregationContainer } from '@elastic/elasticsearch/api/types';
import * as t from 'io-ts';
import { ValuesType } from 'utility-types';
import { AggregateOf } from 'typings/elasticsearch/search';

type AggregationFactory<TType extends t.Type<any>, TAggregation extends AggregationContainer> = (
  type: ValuesType<t.TypeOf<TType>>
) => TAggregation;

type ResolverFn<TAggregation extends AggregationContainer> = (
  response: AggregateOf<TAggregation, unknown>
) => string | number | null;

interface MetricResolver<
  TType extends t.Type<any> = never,
  TAggregation extends AggregationContainer = never
> {
  type: TType;
  getAggregation: AggregationFactory<TType, TAggregation>;
  resolver: ResolverFn<TAggregation>;
}

interface MetricResolverFactory<
  TType extends t.Type<any> = never,
  TAggregation extends AggregationContainer = never
> {
  setType<TNextType extends t.Type<any>>(
    type: TNextType
  ): MetricResolverFactory<TNextType, TAggregation>;
  setAggregationFactory<TNextAggregation extends AggregationContainer>(
    factory: AggregationFactory<TType, TNextAggregation>
  ): MetricResolverFactory<TType, TNextAggregation>;
  setResolver(resolverFn: ResolverFn<TAggregation>): MetricResolverFactory<TType, TAggregation>;
  get: () => MetricResolver<TType, TAggregation>;
}

export function createMetricQueryResolver<
  TType extends t.Type<any>,
  TAggregation extends AggregationContainer
>(
  defaults?: Partial<MetricResolver<TType, TAggregation>>
): MetricResolverFactory<TType, TAggregation>;

export function createMetricQueryResolver(defaults?: Record<string, any>) {
  return {
    setType: (type: t.Type<any>) => {
      return createMetricQueryResolver({
        ...defaults,
        type,
      });
    },
    setAggregationFactory: (aggregationFactory: AggregationFactory<any, any>) => {
      return createMetricQueryResolver({
        ...defaults,
        getAggregation: aggregationFactory,
      });
    },
    setResolver: (resolverFn: ResolverFn<any>) => {
      return createMetricQueryResolver({
        ...defaults,
        resolver: resolverFn,
      });
    },
    get: () => defaults,
  };
}
