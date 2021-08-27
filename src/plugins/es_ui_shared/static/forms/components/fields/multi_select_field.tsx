/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFormRow, EuiPanel, EuiSelectable } from '@elastic/eui';
import React from 'react';
import { getFieldValidityAndErrorMessage } from '../../hook_form_lib/helpers';
import type { FieldHook } from '../../hook_form_lib/types';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const MultiSelectField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      label={field.label}
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiSelectable
        allowExclusions={false}
        height={300}
        onChange={(options) => {
          field.setValue(options);
        }}
        options={field.value as any[]}
        data-test-subj="select"
        {...euiFieldProps}
      >
        {(list, search) => (
          <EuiPanel paddingSize="s" hasShadow={false}>
            {search}
            {list}
          </EuiPanel>
        )}
      </EuiSelectable>
    </EuiFormRow>
  );
};
