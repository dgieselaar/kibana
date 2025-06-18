/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// logs-2024.05.01            -> logs-*
// metrics-2024.01.01-000002  -> metrics-*.*.*-*
// my-index-000001            -> my-index-*
export function maskIndexName(name: string): string {
  // Replace digit sequences with '*' while preserving separators like '-', '_', '.'
  const result = name
    // Numeric rollover suffixes of 6+ digits (e.g. -000001)
    .replace(/([-._])\d{6,}/g, '$1*')
    // Any remaining digit run
    .replace(/\d+/g, '*')
    // Collapse duplicated '*'
    .replace(/\*{2,}/g, '*');

  return result;
}
