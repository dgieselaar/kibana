/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maskIndexName } from './mask_index_name';

describe('maskIndexName', () => {
  const cases: Array<[string, string]> = [
    // Simple rollover / date-stamped indices
    ['logs-2024.05.01', 'logs-*.*.*'],
    ['metrics-2024.01.01-000002', 'metrics-*.*.*-*'],
    ['my-index-000001', 'my-index-*'],

    // Data-stream backing indices (leading .ds-)
    ['.ds-logs-2024.05.01-000002', '.ds-logs-*.*.*-*'],

    // Cross-cluster search (CCS) patterns
    ['prod:logs-2024.05.01', 'prod:logs-*.*.*'],
    ['*:metrics-2024.01.01-000002', '*:metrics-*.*.*-*'],
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(maskIndexName(input)).toBe(expected);
  });
});
