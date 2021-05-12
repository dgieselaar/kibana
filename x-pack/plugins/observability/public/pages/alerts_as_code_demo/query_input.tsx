/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { IndexPattern, QueryStringInput } from '../../../../../../src/plugins/data/public';
import { usePluginContext } from '../../hooks/use_plugin_context';

export function QueryInput({
  value,
  indexPatterns,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (filter: string) => void;
  indexPatterns: IndexPattern[];
  placeholder: string;
}) {
  const {
    plugins: {
      data: { autocomplete },
    },
  } = usePluginContext();

  return (
    <QueryStringInput
      disableAutoFocus={true}
      indexPatterns={indexPatterns}
      size="s"
      disableLanguageSwitcher
      onChange={(e) => {
        onChange(e.query as string);
      }}
      query={{
        language: 'kuery',
        query: value,
      }}
      placeholder={placeholder}
    />
  );
}
