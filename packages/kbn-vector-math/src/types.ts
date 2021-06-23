/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VectorCardinality } from './constants';

export interface VectorMatching {
  // The cardinality of the two Vectors.
  cardinality: VectorCardinality;
  // matchingLabels contains the labels which define equality of a pair of
  // elements from the Vectors.
  matchingLabels: string[];
  // on includes the given label names from matching,
  // rather than excluding them.
  on: boolean;
  // include contains additional labels that should be included in
  // the result from the side with the lower cardinality.
  include: string[];
}

export type BinaryOperator = (lhs: number, rhs: number) => [number, boolean];

export type AggregateOperator = (values: number[]) => number;

export interface AggregateExpression {
  operator: AggregateOperator;
  grouping: string[];
  without: boolean;
}
