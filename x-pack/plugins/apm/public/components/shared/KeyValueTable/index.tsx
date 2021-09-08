/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiTableProps } from '@elastic/eui';
import {
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';
import type { TableHTMLAttributes } from 'react';
import React from 'react';
import type { KeyValuePair } from '../../../utils/flattenObject';
import { FormattedValue } from './FormattedValue';

export function KeyValueTable({
  keyValuePairs,
  tableProps = {},
}: {
  keyValuePairs: KeyValuePair[];
  tableProps?: EuiTableProps & TableHTMLAttributes<HTMLTableElement>;
}) {
  return (
    <EuiTable compressed {...tableProps}>
      <EuiTableBody>
        {keyValuePairs.map(({ key, value }) => (
          <EuiTableRow key={key}>
            <EuiTableRowCell>
              <strong data-test-subj="dot-key">{key}</strong>
            </EuiTableRowCell>
            <EuiTableRowCell data-test-subj="value">
              <FormattedValue value={value} />
            </EuiTableRowCell>
          </EuiTableRow>
        ))}
      </EuiTableBody>
    </EuiTable>
  );
}
