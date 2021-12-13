/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldValuePair,
  CorrelationsClientParams,
} from '../../../common/correlations/types';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export interface OverallLatencyDistributionOptions
  extends CorrelationsClientParams {
  percentileThreshold: number;
  termFilters?: FieldValuePair[];
  apmEventClient: APMEventClient;
  range?: {
    min: number;
    max: number;
  };
}

export interface OverallLatencyDistributionResponse {
  percentileThresholdValue?: number;
  overallHistogram?: Array<{
    key: number;
    doc_count: number;
  }>;
}
