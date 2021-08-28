/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { MLCATEGORY } from '../../../../../../../../../common/constants/field_types';
import { isAdvancedJobCreator } from '../../../../../common/job_creator/type_guards';
import { JobCreatorContext } from '../../../job_creator_context';
import { ESTIMATE_STATUS, useEstimateBucketSpan } from './estimate_bucket_span';

interface Props {
  setEstimating(estimating: boolean): void;
}

export const BucketSpanEstimator: FC<Props> = ({ setEstimating }) => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const { status, estimateBucketSpan } = useEstimateBucketSpan();
  const [noDetectors, setNoDetectors] = useState(jobCreator.detectors.length === 0);
  const [isUsingMlCategory, setIsUsingMlCategory] = useState(checkIsUsingMlCategory());

  useEffect(() => {
    setEstimating(status === ESTIMATE_STATUS.RUNNING);
  }, [status]);

  useEffect(() => {
    setNoDetectors(jobCreator.detectors.length === 0);
    setIsUsingMlCategory(checkIsUsingMlCategory());
  }, [jobCreatorUpdate]);

  function checkIsUsingMlCategory() {
    return (
      isAdvancedJobCreator(jobCreator) &&
      jobCreator.detectors.some((d) => {
        if (
          d.partition_field_name === MLCATEGORY ||
          d.over_field_name === MLCATEGORY ||
          d.by_field_name === MLCATEGORY
        ) {
          return true;
        }
      })
    );
  }

  return (
    <EuiButton
      disabled={
        status === ESTIMATE_STATUS.RUNNING || noDetectors === true || isUsingMlCategory === true
      }
      onClick={estimateBucketSpan}
    >
      <FormattedMessage
        id="xpack.ml.newJob.wizard.pickFieldsStep.bucketSpanEstimatorButton"
        defaultMessage="Estimate bucket span"
      />
    </EuiButton>
  );
};
