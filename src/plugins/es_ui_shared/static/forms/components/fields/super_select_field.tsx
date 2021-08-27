/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiSuperSelectProps } from '@elastic/eui';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { getFieldValidityAndErrorMessage } from '../../hook_form_lib/helpers';
import type { FieldHook } from '../../hook_form_lib/types';

interface Props {
  field: FieldHook;
  euiFieldProps: {
    options: EuiSuperSelectProps<any>['options'];
    [key: string]: any;
  };
  idAria?: string;
  [key: string]: any;
}

export const SuperSelectField = ({
  field,
  euiFieldProps = { options: [] },
  idAria,
  ...rest
}: Props) => {
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
      <EuiSuperSelect
        fullWidth
        valueOfSelected={field.value as string}
        onChange={(value) => {
          field.setValue(value);
        }}
        isInvalid={isInvalid}
        data-test-subj="select"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
