/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import type { FC } from 'react';
import React, { useContext } from 'react';
import type { Field } from '../../../../../../../../../common/types/fields';
import {
  createFieldOptions,
  createMlcategoryFieldOption,
} from '../../../../../common/job_creator/util/general';
import { JobCreatorContext } from '../../../job_creator_context';

interface Props {
  fields: Field[];
  changeHandler(i: string[]): void;
  selectedInfluencers: string[];
}

export const InfluencersSelect: FC<Props> = ({ fields, changeHandler, selectedInfluencers }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const options: EuiComboBoxOptionOption[] = [
    ...createFieldOptions(fields, jobCreator.additionalFields),
    ...createMlcategoryFieldOption(jobCreator.categorizationFieldName),
  ];

  const selection: EuiComboBoxOptionOption[] = selectedInfluencers.map((i) => ({ label: i }));

  function onChange(selectedOptions: EuiComboBoxOptionOption[]) {
    changeHandler(selectedOptions.map((o) => o.label));
  }

  return (
    <EuiComboBox
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={false}
      data-test-subj="mlInfluencerSelect"
    />
  );
};
