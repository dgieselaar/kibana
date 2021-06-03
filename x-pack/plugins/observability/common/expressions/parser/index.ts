/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { create, parseDependencies } from 'mathjs/lib/esm/number';
import type { MathJsStatic } from 'mathjs/lib/esm/number';
import { mean, sum } from 'lodash';
import { isInstantVector } from '../utils';
import { InstantVector } from '../instant_vector';
import {
  aggregationOperator,
  arithmeticOperator,
  comparisonOperator,
  vectorOperator,
} from './operator_with_transform';
import { transform } from './transform';
import { Sample } from '../sample';
import { LabelSet } from '../label_set';

const expressionMath = (create as MathJsStatic['create'])(
  {
    parseDependencies,
  },
  {}
) as Pick<MathJsStatic, 'import' | 'parse'>;

const modifier = (cb: (vector: InstantVector, args: string[]) => InstantVector) => {
  return (...args: any[]) => {
    const vector: unknown = args[args.length - 1];
    const keys = args;
    if (isInstantVector(vector)) {
      keys.pop();
      return cb(vector, keys);
    }

    throw new Error('Grouping operator needs to be followed by an instant vector');
  };
};

const ignoring = modifier((vector, args) => {
  return vector.ignore(args);
});

const on = modifier((vector, args) => {
  return vector.on(args);
});

const without = modifier((vector, args) => {
  return vector.without(args);
});

const by = modifier((vector, args) => {
  return vector.by(args);
});

const bool = modifier((vector) => {
  return vector.bool();
});

const groupLeft = modifier((vector, args) => {
  return vector.groupLeft(args);
});

const groupRight = modifier((vector, args) => {
  return vector.groupRight(args);
});

expressionMath.import(
  {
    add: arithmeticOperator((a, b) => {
      return a + b;
    }),
    subtract: arithmeticOperator((a, b) => {
      return a - b;
    }),
    multiply: arithmeticOperator((a, b) => {
      return a * b;
    }),
    divide: arithmeticOperator((a, b) => {
      return a / b;
    }),
    smaller: comparisonOperator((a, b) => {
      return a < b;
    }),
    smallerEq: comparisonOperator((a, b) => {
      return a <= b;
    }),
    larger: comparisonOperator((a, b) => {
      return a > b;
    }),
    largerEq: comparisonOperator((a, b) => {
      return a >= b;
    }),
    equal: comparisonOperator((a, b) => {
      return a === b;
    }),
    and: vectorOperator((left, right) => {
      const rightSamples = new Map<string, Sample>();
      for (const sample of right.samples) {
        rightSamples.set(sample.sig(), sample);
      }
      return new InstantVector(
        left.time,
        left.samples.filter((sample) => {
          return rightSamples.has(sample.sig());
        })
      );
    }),
    or: vectorOperator((left, right) => {
      const allSamples = left.samples.concat(right.samples);
      const map = new Map<string, Sample>();
      for (const sample of allSamples) {
        const sig = sample.sig();
        if (!map.has(sig)) {
          map.set(sig, sample);
        }
      }
      return new InstantVector(left.time, Array.from(map.values()));
    }),
    not: vectorOperator((left, right) => {
      const rightSamples = new Map<string, Sample>();
      for (const sample of right.samples) {
        rightSamples.set(sample.sig(), sample);
      }
      return new InstantVector(
        left.time,
        left.samples.filter((sample) => {
          return !rightSamples.has(sample.sig());
        })
      );
    }),
    avg: aggregationOperator((values) => {
      return mean(values);
    }),
    sum: aggregationOperator((values) => {
      return sum(values);
    }),
    max: aggregationOperator((values) => {
      return Math.max(...values);
    }),
    min: aggregationOperator((values) => {
      return Math.min(...values);
    }),
    absent: (a: InstantVector | number | null) => {
      if (!isInstantVector(a)) {
        throw new Error('absent() can only be called with an instant vector');
      }
      if (a.empty) {
        return new InstantVector(a.time, [new Sample(new LabelSet({}), 1)]);
      }
      return new InstantVector(a.time, []);
    },
    ignoring,
    without,
    by,
    on,
    bool,
    group_left: groupLeft,
    group_right: groupRight,
  },
  { override: true }
);

export const parse = (expression: string) => {
  const parser = expressionMath
    .parse(expression)
    .transform((node) => transform(node, expressionMath as any));
  return parser;
};
