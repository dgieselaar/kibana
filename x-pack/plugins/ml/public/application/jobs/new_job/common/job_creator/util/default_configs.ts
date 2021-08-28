/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Datafeed } from '../../../../../../../common/types/anomaly_detection_jobs/datafeed';
import type { Detector, Job } from '../../../../../../../common/types/anomaly_detection_jobs/job';
import type { Aggregation, Field } from '../../../../../../../common/types/fields';
import { EVENT_RATE_FIELD_ID } from '../../../../../../../common/types/fields';
import type { IndexPatternTitle } from '../../../../../../../common/types/kibana';
import { splitIndexPatternNames } from '../../../../../../../common/util/job_utils';

export function createEmptyJob(): Job {
  // @ts-expect-error incomplete job
  return {
    job_id: '',
    description: '',
    groups: [],
    analysis_config: {
      bucket_span: '',
      detectors: [],
      influencers: [],
    },
    data_description: {
      time_field: '',
    },
  };
}

export function createEmptyDatafeed(indexPatternTitle: IndexPatternTitle): Datafeed {
  // @ts-expect-error incomplete datafeed
  return {
    datafeed_id: '',
    job_id: '',
    indices: splitIndexPatternNames(indexPatternTitle),
    query: {},
  };
}

export function createBasicDetector(agg: Aggregation, field: Field) {
  const dtr: Detector = {
    function: agg.id,
  };

  if (field.id !== EVENT_RATE_FIELD_ID) {
    dtr.field_name = field.id;
  }
  return dtr;
}
