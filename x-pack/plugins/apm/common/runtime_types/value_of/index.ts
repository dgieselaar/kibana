/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { ValuesType } from 'utility-types';

export function valueOf<
  T extends Record<string, string | number | boolean>,
  U extends ValuesType<T>
>(object: T) {
  return t.union(
    (Object.values(object).map((val) => t.literal(val)) as unknown) as [
      t.LiteralC<U>,
      t.LiteralC<U>,
      ...Array<t.LiteralC<U>>
    ]
  );
}
