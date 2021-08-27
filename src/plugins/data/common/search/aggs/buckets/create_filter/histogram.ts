/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { RangeFilterParams } from '@kbn/es-query';
import { buildRangeFilter } from '@kbn/es-query';
import type { AggTypesDependencies } from '../../agg_types';
import type { IBucketAggConfig } from '../bucket_agg_type';

/** @internal */
export const createFilterHistogram = (
  getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart']
) => {
  return (aggConfig: IBucketAggConfig, key: string) => {
    const { deserialize } = getFieldFormatsStart();
    const value = parseInt(key, 10);
    const params: RangeFilterParams = {
      gte: value,
      lt:
        value +
        (typeof aggConfig.params.used_interval === 'number'
          ? aggConfig.params.used_interval
          : aggConfig.params.interval),
    };

    return buildRangeFilter(
      aggConfig.params.field,
      params,
      aggConfig.getIndexPattern(),
      deserialize(aggConfig.toSerializedFieldFormat()).convert(key)
    );
  };
};
