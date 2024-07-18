/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLRow } from '@kbn/es-types';

export function queryResultToKeyValue({
  columns,
  rows,
}: {
  columns: Array<{ name: string }>;
  rows: ESQLRow[];
}) {
  return rows.map((values) => {
    return values.reduce<Record<string, unknown>>((prev, value, indexOfValue) => {
      const column = columns[indexOfValue];

      prev[column.name] = value;
      return prev;
    }, {});
  });
}
