/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { timeseriesSchema } from './timeseries_schema';

/**
 * Zod transformer that takes any parsed value and returns its serialized JSON string.
 */
export const serialize = z.any().transform((value: unknown): string => JSON.stringify(value));

export const serializeTimeseries = timeseriesSchema.transform((data) => {
  return data.flatMap(({ x, y, change }) => {
    const coord = `${x}: ${y}`;
    if (change?.p_value) {
      return [coord, `Change: ${change.type} (${change.significance})`];
    }
    return [coord];
  });
});
