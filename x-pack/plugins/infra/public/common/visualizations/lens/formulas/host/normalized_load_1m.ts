/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaConfig } from '@kbn/visualization-utils';

export const normalizedLoad1m: FormulaConfig = {
  label: 'Normalized Load',
  value: 'average(system.load.1) / max(system.load.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 0,
    },
  },
};
