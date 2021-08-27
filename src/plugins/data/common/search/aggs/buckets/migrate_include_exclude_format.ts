/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isObject, isString } from 'lodash';
import type { IAggConfig } from '../agg_config';
import type { BucketAggParam, IBucketAggConfig } from './bucket_agg_type';
import { BucketAggType } from './bucket_agg_type';

export const isType = (...types: string[]) => {
  return (agg: IAggConfig): boolean => {
    const field = agg.params.field;

    return types.some((type) => field && field.type === type);
  };
};

export const isNumberType = isType('number');
export const isStringType = isType('string');
export const isStringOrNumberType = isType('string', 'number');

export const migrateIncludeExcludeFormat = {
  serialize(this: BucketAggParam<IBucketAggConfig>, value: any, agg: IBucketAggConfig) {
    if (this.shouldShow && !this.shouldShow(agg)) return;
    if (!value || isString(value) || Array.isArray(value)) return value;
    else return value.pattern;
  },
  write(
    this: BucketAggType<IBucketAggConfig>,
    aggConfig: IBucketAggConfig,
    output: Record<string, any>
  ) {
    const value = aggConfig.getParam(this.name);

    if (Array.isArray(value) && value.length > 0 && isNumberType(aggConfig)) {
      const parsedValue = value.filter((val): val is number => Number.isFinite(val));
      if (parsedValue.length) {
        output.params[this.name] = parsedValue;
      }
    } else if (isObject(value)) {
      output.params[this.name] = (value as any).pattern;
    } else if (value && isStringType(aggConfig)) {
      output.params[this.name] = value;
    }
  },
} as Partial<BucketAggParam<IBucketAggConfig>>;
