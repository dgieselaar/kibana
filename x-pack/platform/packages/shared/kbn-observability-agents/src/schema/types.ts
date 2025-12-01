/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointType } from '@kbn/es-types';

export type Timeseries = Array<{
  x: string;
  y: number | null;
  change: null | {
    type: ChangePointType;
    significance: 'high' | 'medium' | 'low' | null;
    p_value: number | null;
  };
}>;
