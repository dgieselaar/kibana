/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Timeseries } from './types';

type ChangePointType =
  | 'dip'
  | 'spike'
  | 'distribution_change'
  | 'step_change'
  | 'trend_change'
  | 'stationary'
  | 'non_stationary'
  | 'indeterminable';

export const changePointSchema: z.ZodSchema<ChangePointType> = z.union([
  z.literal('dip'),
  z.literal('spike'),
  z.literal('distribution_change'),
  z.literal('step_change'),
  z.literal('trend_change'),
  z.literal('stationary'),
  z.literal('non_stationary'),
  z.literal('indeterminable'),
]);

export const timeseriesSchema: z.ZodSchema<Timeseries> = z.array(
  z.object({
    x: z.string(),
    y: z.union([z.number(), z.null()]),
    change: z.union([
      z.null(),
      z.object({
        type: changePointSchema,
        significance: z.union([z.literal('high'), z.literal('medium'), z.literal('low'), z.null()]),
        p_value: z.union([z.number(), z.null()]),
      }),
    ]),
  })
);
