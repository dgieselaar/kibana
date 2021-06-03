/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { compact } from 'lodash';
import { isFiniteNumber } from '../../utils/is_finite_number';
import { InstantVector } from '../instant_vector';
import { Sample } from '../sample';
import { AggregateOperator } from '../types';
import { isInstantVector } from '../utils';

export const arithmeticOperator = (operator: (a: number, b: number) => number) => {
  function callScalar(a: number, b: number) {
    const res = operator(a, b);
    if (!isFiniteNumber(res)) {
      throw new Error('Operator did not return a number, but ' + res);
    }
    return res;
  }

  function callElement(a: number, b: number) {
    return [callScalar(a, b), true] as [number, boolean];
  }

  return (left: InstantVector | number, right: InstantVector | number) => {
    if (!isInstantVector(left) && !isInstantVector(right)) {
      return callScalar(left, right);
    }

    if (isInstantVector(left) && isInstantVector(right)) {
      return right.binop(left, callElement);
    }

    if (isInstantVector(right)) {
      return new InstantVector(
        right.time,
        right.samples.map(
          (sample) => new Sample(sample.labels, callScalar(left as number, sample.value))
        )
      );
    }

    if (!isInstantVector(left)) {
      // help TypeScript a bit
      throw new Error('Left was unexpectedly not an instant vector');
    }

    return new InstantVector(
      left.time,
      left.samples.map(
        (sample) => new Sample(sample.labels, callScalar(sample.value, right as number))
      )
    );
  };
};

export const comparisonOperator = (operator: (a: number, b: number) => boolean) => {
  function callScalar(a: number, b: number) {
    const res = operator(a, b);
    return res ? 1 : 0;
  }

  function callElement(a: number, b: number) {
    return [a, operator(a, b)] as [number, boolean];
  }

  return (left: InstantVector | number, right: InstantVector | number) => {
    if (!isInstantVector(left) && !isInstantVector(right)) {
      return callScalar(left, right);
    }

    if (isInstantVector(left) && isInstantVector(right)) {
      return right.binop(left, callElement);
    }

    if (isInstantVector(right)) {
      return new InstantVector(
        right.time,
        right.samples.map(
          (sample) => new Sample(sample.labels, callScalar(left as number, sample.value))
        )
      );
    }

    if (!isInstantVector(left)) {
      // help TypeScript a bit
      throw new Error('Left was unexpectedly not an instant vector');
    }

    const bool = left.getModifiers().binary.bool;

    return new InstantVector(
      left.time,
      compact(
        left.samples.map((sample) => {
          // eslint-disable-next-line prefer-const
          let [value, keep] = callElement(sample.value, right as number);
          if (bool) {
            value = keep ? 1 : 0;
          } else if (!keep) {
            return null;
          }
          return new Sample(sample.labels, value);
        })
      )
    );
  };
};

export const aggregationOperator = (operator: AggregateOperator) => {
  return (vector: InstantVector) => {
    return vector.aggregate(operator);
  };
};

export const vectorOperator = (
  operator: (left: InstantVector, right: InstantVector) => InstantVector
) => {
  return (left: InstantVector | number, right: InstantVector | number) => {
    if (isInstantVector(left) && isInstantVector(right)) {
      return operator(left, right);
    }
    throw new Error('Operator can only be applied to two vectors');
  };
};
