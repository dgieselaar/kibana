/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Measurement {
  labels: Record<string, string>;
  metrics: Record<string, number | null>;
  time: number;
}

export interface MeasurementAlert {
  labels: Record<string, string>;
  context?: Record<string, string>;
  metrics: Record<string, number | null>;
  actionGroupId?: string;
  time: number;
}
