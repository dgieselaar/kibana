/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { IndexPattern, KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/public';

export function GroupBySelect({
  indexPatterns,
  value,
  onChange,
}: {
  indexPatterns: IndexPattern[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const suggestions = indexPatterns
    .flatMap((pattern) => pattern.fields)
    .filter((field) => {
      return field.type === KBN_FIELD_TYPES.STRING;
    })
    .map((field) => {
      return {
        label: field.name,
      };
    });

  return (
    <EuiComboBox
      placeholder="No grouping"
      options={suggestions}
      onChange={(options) => {
        onChange(options.map((option) => option.label));
      }}
      onCreateOption={(label) => {
        onChange(value.concat(label));
      }}
      selectedOptions={value.map((val) => {
        return {
          label: val,
        };
      })}
    />
  );
}
