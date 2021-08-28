/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFieldText } from '@elastic/eui';
import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { calculateDatafeedFrequencyDefaultSeconds } from '../../../../../../../../../common/util/job_utils';
import { JobCreatorContext } from '../../../job_creator_context';
import { useStringifiedValue } from '../hooks';
import { Description } from './description';

export const FrequencyInput: FC = () => {
  const {
    jobCreator,
    jobCreatorUpdate,
    jobCreatorUpdated,
    jobValidator,
    jobValidatorUpdated,
  } = useContext(JobCreatorContext);
  const [validation, setValidation] = useState(jobValidator.frequency);
  const { value: frequency, setValue: setFrequency } = useStringifiedValue(jobCreator.frequency);

  const [defaultFrequency, setDefaultFrequency] = useState(createDefaultFrequency());

  useEffect(() => {
    jobCreator.frequency = frequency === '' ? null : frequency;
    jobCreatorUpdate();
  }, [frequency]);

  useEffect(() => {
    setFrequency(jobCreator.frequency);

    const df = createDefaultFrequency();
    setDefaultFrequency(df);
  }, [jobCreatorUpdated]);

  useEffect(() => {
    setValidation(jobValidator.frequency);
  }, [jobValidatorUpdated]);

  function createDefaultFrequency() {
    const df = calculateDatafeedFrequencyDefaultSeconds(jobCreator.bucketSpanMs / 1000);
    return `${df}s`;
  }

  return (
    <Description validation={validation}>
      <EuiFieldText
        value={frequency}
        placeholder={defaultFrequency}
        onChange={(e) => setFrequency(e.target.value)}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardInputFrequency"
      />
    </Description>
  );
};
