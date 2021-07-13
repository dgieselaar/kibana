/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LabelSet } from '../../../../common/expressions/label_set';

export interface MeasurementAlert {
  labels: LabelSet;
  context?: Record<string, string | number | null>;
  actionGroupId?: string;
  time: number;
}
