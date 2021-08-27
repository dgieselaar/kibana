/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCheckbox, EuiFormRow } from '@elastic/eui';
import React from 'react';
import uuid from 'uuid';
import { getFieldValidityAndErrorMessage } from '../../hook_form_lib/helpers';
import type { FieldHook } from '../../hook_form_lib/types';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const CheckBoxField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiCheckbox
        label={field.label}
        checked={field.value as boolean}
        onChange={field.onChange}
        id={euiFieldProps.id || uuid()}
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
