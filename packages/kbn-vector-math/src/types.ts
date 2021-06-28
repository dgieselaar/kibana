/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SetIntersection, SetDifference, ValuesType } from 'utility-types';
import { VectorCardinality } from './constants';
import { InstantVector } from './instant_vector';

export interface VectorMatching<
  TOn extends boolean,
  TMatchingLabels extends string[],
  TInclude extends string[],
  TVectorCardinality extends VectorCardinality
> {
  // The cardinality of the two Vectors.
  cardinality: TVectorCardinality;
  // matchingLabels contains the labels which define equality of a pair of
  // elements from the Vectors.
  matchingLabels: TMatchingLabels;
  // on includes the given label names from matching,
  // rather than excluding them.
  on: TOn;
  // include contains additional labels that should be included in
  // the result from the side with the lower cardinality.
  include: TInclude;
}

export type BinaryOperator = (lhs: number, rhs: number) => [number, boolean];

export type AggregateOperator = (values: number[]) => number;

export interface AggregateExpression {
  operator: AggregateOperator;
  grouping: string[];
  without: boolean;
}

export type MatchLabels<
  TLabels extends Record<string, string>,
  TOn extends boolean,
  TKeysToPick extends Array<keyof TLabels & string>
> = TOn extends true
  ? Record<SetIntersection<keyof TLabels, ValuesType<TKeysToPick>>, string>
  : Record<SetDifference<keyof TLabels, ValuesType<TKeysToPick>>, string>;

export type AggregateInstantVector<
  TLabels extends Record<string, string>,
  TWithout extends boolean,
  TGroupingLabels extends Array<keyof TLabels & string>
> = TGroupingLabels extends { length: 0 }
  ? number
  : InstantVector<
      MatchLabels<TLabels, TWithout extends true ? false : true, TGroupingLabels>,
      false,
      [],
      [],
      VectorCardinality.OneToOne,
      false,
      [],
      false
    >;
