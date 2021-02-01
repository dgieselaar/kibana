/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function asMutableArray<T extends Readonly<any>>(
  arr: T
): T extends Readonly<[...infer U]> ? U : unknown[] {
  return arr as any;
}
