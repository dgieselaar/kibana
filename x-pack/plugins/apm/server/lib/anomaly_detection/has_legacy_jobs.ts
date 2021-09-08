/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { withApmSpan } from '../../utils/with_apm_span';
import type { Setup } from '../helpers/setup_request';
import { getMlJobsWithAPMGroup } from './get_ml_jobs_with_apm_group';

// Determine whether there are any legacy ml jobs.
// A legacy ML job has a job id that ends with "high_mean_response_time" and created_by=ml-module-apm-transaction
export function hasLegacyJobs(setup: Setup) {
  const { ml } = setup;

  if (!ml) {
    throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
  }

  return withApmSpan('has_legacy_jobs', async () => {
    const mlCapabilities = await withApmSpan('get_ml_capabilities', () =>
      ml.mlSystem.mlCapabilities()
    );
    if (!mlCapabilities.mlFeatureEnabledInSpace) {
      throw Boom.forbidden(ML_ERRORS.ML_NOT_AVAILABLE_IN_SPACE);
    }

    const response = await getMlJobsWithAPMGroup(ml.anomalyDetectors);
    return response.jobs.some(
      (job) =>
        job.job_id.endsWith('high_mean_response_time') &&
        job.custom_settings?.created_by === 'ml-module-apm-transaction'
    );
  });
}
