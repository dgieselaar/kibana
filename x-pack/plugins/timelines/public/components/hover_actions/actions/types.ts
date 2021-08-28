/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiButtonIconPropsForButton } from '@elastic/eui';
import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { FilterManager } from '../../../../../../../src/plugins/data/public/query/filter_manager/filter_manager';

export interface FilterValueFnArgs {
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  field: string;
  value: string[] | string | null | undefined;
  filterManager: FilterManager | undefined;
  onFilterAdded: (() => void) | undefined;
}

export interface HoverActionComponentProps {
  defaultFocusedButtonRef?: EuiButtonIconPropsForButton['buttonRef'];
  field: string;
  keyboardEvent?: React.KeyboardEvent;
  ownFocus: boolean;
  onClick?: () => void;
  showTooltip?: boolean;
  value?: string[] | string | null;
}
