/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiComboBox } from '@elastic/eui';

export function IndexSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (index: string[]) => void;
}) {
  return (
    <EuiComboBox
      compressed
      selectedOptions={(value ?? []).map((index) => ({
        label: index,
      }))}
      onChange={(options) => {
        onChange(options.map((option) => option.label));
      }}
      onCreateOption={(index) => {
        onChange((value ?? []).concat(index));
      }}
      noSuggestions
    />
  );
}
