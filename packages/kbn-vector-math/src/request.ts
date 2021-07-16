/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PickByValueExact } from 'utility-types';

enum FieldType {
  float = 'float',
  histogram = 'histogram',
  label = 'label',
}

interface Field {
  type: FieldType;
}

interface FieldRecord {
  [key: string]: Field;
}

interface LargerThan {
  gt: number;
}
interface EqLargerThan {
  gte: number;
}
interface SmallerThan {
  lt: number;
}
interface EqSmallerThan {
  lte: number;
}

type FloatFilter =
  | ((LargerThan | EqLargerThan) & (SmallerThan | EqSmallerThan))
  | (LargerThan | EqLargerThan | SmallerThan | EqSmallerThan)
  | number;

type TermFilter = string;

type SingleFilter<TFilter> = TFilter;
type OrFilter<TFilter> = TFilter[];
interface NegFilter<TFilter> {
  not: TFilter;
}

type AsFilter<TFilter> = SingleFilter<TFilter> | OrFilter<TFilter> | NegFilter<TFilter>;

type Select<TFieldRecord extends FieldRecord> = {
  [key in keyof TFieldRecord]?: TFieldRecord[key] extends { type: FieldType.float }
    ? AsFilter<FloatFilter>
    : TFieldRecord[key] extends { type: FieldType.histogram }
    ? AsFilter<FloatFilter>
    : TFieldRecord[key] extends { type: FieldType.label }
    ? AsFilter<TermFilter>
    : never;
};

type LabelsOf<TFieldRecord extends FieldRecord> = keyof PickByValueExact<
  {
    [key in keyof TFieldRecord]: TFieldRecord[key]['type'] extends FieldType.label ? true : false;
  },
  true
> &
  string;

type MetricsOf<TFieldRecord extends FieldRecord> = keyof PickByValueExact<
  {
    [key in keyof TFieldRecord]: TFieldRecord[key]['type'] extends FieldType.float
      ? true
      : TFieldRecord[key]['type'] extends FieldType.histogram
      ? true
      : false;
  },
  true
> &
  string;

interface TimeRange {
  from: number;
  to: number;
}

type Interval = string;

enum AggregationType {
  min = 'min',
  max = 'max',
  sum = 'sum',
  avg = 'avg',
  count = 'count',
  top = 'top',
}

interface Aggregation<TAggregationType extends AggregationType, TMetric extends string> {
  type: TAggregationType;
  metric: TMetric;
}

interface AggregationApi<
  TFieldRecord extends FieldRecord,
  TSelect extends Select<FieldRecord>,
  TTimeRange extends TimeRange | undefined = undefined,
  TGroups extends Array<LabelsOf<TFieldRecord>> = [],
  TInterval extends Interval | undefined = undefined,
  TAggregations extends Array<Aggregation<AggregationType, MetricsOf<TFieldRecord>>> = []
> {
  range(
    from: number,
    to: number
  ): AggregationApi<TFieldRecord, TSelect, TimeRange, TGroups, TInterval, TAggregations>;
  group<TNextGroups extends Array<LabelsOf<TFieldRecord>>>(
    ...groups: TNextGroups
  ): AggregationApi<
    TFieldRecord,
    TSelect,
    TTimeRange,
    [...TGroups, ...TNextGroups],
    TInterval,
    TAggregations
  >;
  interval<TNextInterval extends Interval>(
    interval: TNextInterval
  ): AggregationApi<TFieldRecord, TSelect, TTimeRange, TGroups, TNextInterval, TAggregations>;
  min<TMetric extends MetricsOf<TFieldRecord>>(
    metric: TMetric
  ): AggregationApi<
    TFieldRecord,
    TSelect,
    TTimeRange,
    TGroups,
    TInterval,
    [...TAggregations, Aggregation<AggregationType.min, TMetric>]
  >;
  max<TMetric extends MetricsOf<TFieldRecord>>(
    metric: TMetric
  ): AggregationApi<
    TFieldRecord,
    TSelect,
    TTimeRange,
    TGroups,
    TInterval,
    [...TAggregations, Aggregation<AggregationType.max, TMetric>]
  >;
  toEsDsl(): unknown;
}

type CreateSelect<TFieldRecord extends FieldRecord> = <TSelect extends Select<TFieldRecord>>(
  select: TSelect
) => AggregationApi<TFieldRecord, TSelect>;

const select: CreateSelect<{
  'service.name': { type: FieldType.label };
  'transaction.duration.us': { type: FieldType.float };
}> = {} as any;

select({
  'service.name': 'opbeans-java',
})
  .group('service.name')
  .interval('1d')
  .range(0, 100)
  .min('transaction.duration.us');

// select({
//   'service.name': 'opbeans-java',
// })
//   .range()
//   .group('service.name')
//   .interval('1d')
//   .max('transaction.duration.us')
//   .top('agent.name')
//   .toEs();

// max({
//   metric: 'transaction_duration_us',
//   filters: {
//     'service.name': 'opbeans-java',
//   },
// });
