/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { IndexPatternField } from '../../../../../data/common/index_patterns/fields/index_pattern_field';
import type { DocViewFilterFn } from '../../doc_views/doc_views_types';
import { DocViewTableRowBtnFilterAdd } from './table_row_btn_filter_add';
import { DocViewTableRowBtnFilterExists } from './table_row_btn_filter_exists';
import { DocViewTableRowBtnFilterRemove } from './table_row_btn_filter_remove';
import { DocViewTableRowBtnToggleColumn } from './table_row_btn_toggle_column';

interface TableActionsProps {
  field: string;
  isActive: boolean;
  flattenedField: unknown;
  fieldMapping?: IndexPatternField;
  onFilter: DocViewFilterFn;
  onToggleColumn: (field: string) => void;
}

export const TableActions = ({
  isActive,
  field,
  fieldMapping,
  flattenedField,
  onToggleColumn,
  onFilter,
}: TableActionsProps) => {
  return (
    <div className="kbnDocViewer__buttons">
      <DocViewTableRowBtnFilterAdd
        disabled={!fieldMapping || !fieldMapping.filterable}
        onClick={() => onFilter(fieldMapping, flattenedField, '+')}
      />
      <DocViewTableRowBtnFilterRemove
        disabled={!fieldMapping || !fieldMapping.filterable}
        onClick={() => onFilter(fieldMapping, flattenedField, '-')}
      />
      <DocViewTableRowBtnToggleColumn
        active={isActive}
        fieldname={field}
        onClick={() => onToggleColumn(field)}
      />
      <DocViewTableRowBtnFilterExists
        disabled={!fieldMapping || !fieldMapping.filterable}
        onClick={() => onFilter('_exists_', field, '+')}
        scripted={fieldMapping && fieldMapping.scripted}
      />
    </div>
  );
};
