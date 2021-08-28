/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDatePickerProps } from '@elastic/eui';
import { EuiDatePicker } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import type { StyledComponent } from 'styled-components';
import type { EuiTheme } from '../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { euiStyled } from '../../../../../src/plugins/kibana_react/common/eui_styled_components';

// The return type of this component needs to be specified because the inferred
// return type depends on types that are not exported from EUI. You get a TS4023
// error if the return type is not specified.
export const FixedDatePicker: StyledComponent<
  FunctionComponent<EuiDatePickerProps>,
  EuiTheme
> = euiStyled(
  ({
    className,
    inputClassName,
    ...datePickerProps
  }: {
    className?: string;
    inputClassName?: string;
  } & EuiDatePickerProps) => (
    <EuiDatePicker {...datePickerProps} className={inputClassName} popperClassName={className} />
  )
)`
  z-index: 3 !important;
`;
