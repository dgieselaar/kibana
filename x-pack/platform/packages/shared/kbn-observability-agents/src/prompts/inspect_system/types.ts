/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Timeseries } from '../../schema/types';

export interface InspectSystemOptions {
  arguments: {
    index: string;
    kql: string;
  };
}

export interface InspectSystemPromptInput {
  kql: string;
  log_patterns: Array<{
    pattern: string;
    example: string;
    timeseries: Timeseries;
  }>;
  key_metrics: Array<{
    query: string;
    timeseries: Timeseries;
  }>;
  alerts: Array<unknown>;
  slos: Array<unknown>;
  anomalies: Array<unknown>;
}
