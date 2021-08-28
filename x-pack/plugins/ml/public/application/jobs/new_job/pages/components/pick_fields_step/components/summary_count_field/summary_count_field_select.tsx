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
  createDocCountFieldOption,
  createFieldOptions,
} from '../../../../../common/job_creator/util/general';
import { JobCreatorContext } from '../../../job_creator_context';

interface Props {
  fields: Field[];
  changeHandler(i: string | null): void;
  selectedField: string | null;
}

export const SummaryCountFieldSelect: FC<Props> = ({ fields, changeHandler, selectedField }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const options: EuiComboBoxOptionOption[] = [
    ...createDocCountFieldOption(jobCreator.aggregationFields.length > 0),
    ...createFieldOptions(fields, jobCreator.additionalFields),
  ];

  const selection: EuiComboBoxOptionOption[] = [];
  if (selectedField !== null) {
    selection.push({ label: selectedField });
  }

  function onChange(selectedOptions: EuiComboBoxOptionOption[]) {
    const option = selectedOptions[0];
    if (typeof option !== 'undefined') {
      changeHandler(option.label);
    } else {
      changeHandler(null);
    }
  }

  return (
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={true}
      data-test-subj="mlSummaryCountFieldNameSelect"
    />
  );
};
