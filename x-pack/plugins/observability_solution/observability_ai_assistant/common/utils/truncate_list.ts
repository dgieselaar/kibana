/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function truncateList<T>(values: T[], maxLength: number = 25): Array<T | string> {
  const diff = values.length - maxLength;

  if (diff <= 0) {
    return values;
  }

  return [...values.slice(0, maxLength), `${diff} more items...`];
}
