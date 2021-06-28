/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick, compact } from 'lodash';
import { VectorCardinality } from './constants';
import {
  AggregateInstantVector,
  AggregateOperator,
  BinaryOperator,
  MatchLabels,
  VectorMatching,
} from './types';
import { Sample } from './sample';
import { LabelSet } from './label_set';

interface InstantVectorModifiers<
  TOn extends boolean,
  TMatchingLabels extends string[],
  TInclude extends string[],
  TVectorCardinality extends VectorCardinality,
  TWithout extends boolean,
  TGroupingLabels extends string[],
  TBool extends boolean
> {
  vectorMatching: VectorMatching<TOn, TMatchingLabels, TInclude, TVectorCardinality>;
  aggregate: {
    grouping: TGroupingLabels;
    without: TWithout;
  };
  binary: {
    bool: TBool;
  };
}

const getDefaultModifiers = () => ({
  vectorMatching: {
    cardinality: VectorCardinality.OneToOne,
    include: [],
    matchingLabels: [],
    on: false,
  },
  aggregate: {
    grouping: [],
    without: false,
  },
  binary: {
    bool: false,
  },
});

export class InstantVector<
  TLabels extends Record<string, string> = Record<string, string>,
  TOn extends boolean = boolean,
  TMatchingLabels extends string[] = string[],
  TInclude extends string[] = string[],
  TVectorCardinality extends VectorCardinality = VectorCardinality,
  TWithout extends boolean = boolean,
  TGroupingLabels extends string[] = string[],
  TBool extends boolean = boolean
> {
  private readonly signatures: Map<string, Sample<TLabels>> = new Map();
  public readonly samples: Array<Sample<TLabels>> = [];

  public readonly time: number = NaN;
  private readonly modifiers: InstantVectorModifiers<
    TOn,
    TMatchingLabels,
    TInclude,
    TVectorCardinality,
    TWithout,
    TGroupingLabels,
    TBool
  > = getDefaultModifiers() as any;

  constructor(time: number, samples: Array<Sample<TLabels>>);

  constructor(
    time: number,
    samples: Map<string, Sample<TLabels>>,
    modifiers: InstantVectorModifiers<
      TOn,
      TMatchingLabels,
      TInclude,
      TVectorCardinality,
      TWithout,
      TGroupingLabels,
      TBool
    >
  );

  constructor(
    time: number,
    samples: Array<Sample<TLabels>> | Map<string, Sample<TLabels>>,
    modifiers?: InstantVectorModifiers<
      TOn,
      TMatchingLabels,
      TInclude,
      TVectorCardinality,
      TWithout,
      TGroupingLabels,
      TBool
    >
  ) {
    this.time = time;
    if (Array.isArray(samples)) {
      for (const sample of samples) {
        const sig = sample.sig();
        if (this.signatures.has(sig)) {
          throw new Error(
            `Duplicated samples found, have to be unique: ${JSON.stringify(sample.labels.record)}`
          );
        }
        this.signatures.set(sig, sample);
      }
    } else {
      this.signatures = samples;
    }

    if (modifiers) {
      this.modifiers = modifiers;
    }

    this.samples = Array.from(this.signatures.values());
  }

  binop(
    lhs: number,
    operator: BinaryOperator
  ): InstantVector<
    MatchLabels<TLabels, false, []>,
    false,
    [],
    [],
    VectorCardinality.OneToOne,
    false,
    [],
    false
  >;

  binop<TLeftLabels extends Record<string, string>>(
    lhs: InstantVector<TLeftLabels>,
    operator: BinaryOperator
  ): InstantVector<
    MatchLabels<
      TVectorCardinality extends VectorCardinality.OneToMany ? TLeftLabels : TLabels,
      TOn,
      TMatchingLabels | (TVectorCardinality extends VectorCardinality.OneToOne ? [] : TInclude)
    >,
    false,
    [],
    [],
    VectorCardinality.OneToOne,
    false,
    [],
    false
  >;

  binop(lhs: number | InstantVector, operator: BinaryOperator) {
    if (typeof lhs === 'number') {
      return new InstantVector(
        this.time,
        compact(
          this.samples.map((sample) => {
            const val = operator(lhs, sample.value);
            return this.modifiers.binary.bool && !val[1] ? null : new Sample(sample.labels, val[0]);
          })
        )
      ) as any;
    }

    let left = lhs as InstantVector;
    let right = (this as unknown) as InstantVector;

    const isOneToOne = this.modifiers.vectorMatching.cardinality === VectorCardinality.OneToOne;
    const swap = this.modifiers.vectorMatching.cardinality === VectorCardinality.OneToMany;
    const bool = this.modifiers.binary.bool;

    if (swap) {
      [left, right] = [right, left];
    }

    const rightSamples: Map<string, Sample<Record<string, string>>> = new Map();
    for (const sample of right.samples) {
      const sig = sample.sig(this.modifiers.vectorMatching);
      if (rightSamples.has(sig)) {
        throw new Error(
          `Found duplicated label set on ${
            swap ? 'left' : 'right'
          } hand-side of the operation: ${JSON.stringify(
            sample.labels.drop(this.modifiers.vectorMatching)
          )}`
        );
      }
      rightSamples.set(sig, sample);
    }

    const samples: Map<string, Sample<Record<string, string>>> = new Map();

    for (const leftSample of left.samples) {
      const sig = leftSample.sig(this.modifiers.vectorMatching);
      const rightSample = rightSamples.get(sig);
      if (!rightSample) {
        continue;
      }
      let leftValue = leftSample.value;
      let rightValue = rightSample.value;
      if (swap) {
        [leftValue, rightValue] = [rightValue, leftValue];
      }

      // eslint-disable-next-line prefer-const
      let [value, keep] = operator(leftValue, rightValue);
      if (bool) {
        value = keep ? 1 : 0;
      } else if (!keep) {
        continue;
      }

      const labels = isOneToOne
        ? leftSample.labels.drop(this.modifiers.vectorMatching)
        : new LabelSet({
            ...leftSample.labels.record,
            ...pick(rightSample.labels.record, this.modifiers.vectorMatching.include),
          });

      if (isOneToOne) {
        rightSamples.delete(sig);
      }

      const sample = new Sample(labels, value);
      const nextSig = sample.sig();
      if (samples.has(nextSig)) {
        throw new Error(
          `Found duplicated label set for result vector: ${JSON.stringify(
            sample.labels.drop(this.modifiers.vectorMatching)
          )}`
        );
      }
      samples.set(nextSig, sample);
    }

    return new InstantVector(this.time, Array.from(samples.values())) as any;
  }

  aggregate(op: AggregateOperator): AggregateInstantVector<TLabels, TWithout, TGroupingLabels> {
    if (this.modifiers.aggregate.grouping.length === 0 && !this.modifiers.aggregate.without) {
      return op(this.samples.map((sample) => sample.value)) as AggregateInstantVector<
        TLabels,
        TWithout,
        TGroupingLabels
      >;
    }

    const groups: Map<
      string,
      {
        labels: LabelSet<Record<string, string>>;
        values: number[];
      }
    > = new Map();
    for (const sample of this.samples) {
      const labels = sample.labels.drop({
        matchingLabels: this.modifiers.aggregate.grouping,
        on: !this.modifiers.aggregate.without,
      });
      const sig = labels.sig();
      if (!groups.has(sig)) {
        groups.set(sig, { labels, values: [] });
      }
      const group = groups.get(sig)!;
      group.values.push(sample.value);
    }

    return new InstantVector(
      this.time,
      Array.from(groups.values()).map(({ labels, values }) => {
        return new Sample(labels, op(values));
      })
    ) as AggregateInstantVector<TLabels, TWithout, TGroupingLabels>;
  }

  ignore<TNextMatchingLabels extends Array<keyof TLabels & string>>(
    ...labels: TNextMatchingLabels
  ): InstantVector<
    TLabels,
    false,
    TNextMatchingLabels,
    TInclude,
    TVectorCardinality,
    TWithout,
    TGroupingLabels,
    TBool
  > {
    return new InstantVector(this.time, this.signatures, {
      ...this.modifiers,
      vectorMatching: {
        ...this.modifiers.vectorMatching,
        on: false,
        matchingLabels: labels,
      },
    });
  }

  on<TNextMatchingLabels extends Array<keyof TLabels & string>>(
    ...labels: TNextMatchingLabels
  ): InstantVector<
    TLabels,
    true,
    TNextMatchingLabels,
    TInclude,
    TVectorCardinality,
    TWithout,
    TGroupingLabels,
    TBool
  > {
    return new InstantVector(this.time, this.signatures, {
      ...this.modifiers,
      vectorMatching: {
        ...this.modifiers.vectorMatching,
        on: true,
        matchingLabels: labels,
      },
    });
  }

  without<TNextGroupingLabels extends Array<keyof TLabels & string>>(
    ...labels: TNextGroupingLabels
  ): InstantVector<
    TLabels,
    TOn,
    TMatchingLabels,
    TInclude,
    TVectorCardinality,
    true,
    TNextGroupingLabels,
    TBool
  > {
    return new InstantVector(this.time, this.signatures, {
      ...this.modifiers,
      aggregate: {
        grouping: labels,
        without: true,
      },
    });
  }

  by<TNextGroupingLabels extends Array<keyof TLabels & string>>(
    ...labels: TNextGroupingLabels
  ): InstantVector<
    TLabels,
    TOn,
    TMatchingLabels,
    TInclude,
    TVectorCardinality,
    false,
    TNextGroupingLabels,
    TBool
  > {
    return new InstantVector(this.time, this.signatures, {
      ...this.modifiers,
      aggregate: {
        grouping: labels,
        without: false,
      },
    });
  }

  groupLeft<TNextIncludeLabels extends string[]>(
    ...labels: TNextIncludeLabels
  ): InstantVector<
    TLabels,
    TOn,
    TMatchingLabels,
    TNextIncludeLabels,
    VectorCardinality.OneToMany,
    TWithout,
    TGroupingLabels,
    TBool
  > {
    return new InstantVector(this.time, this.signatures, {
      ...this.modifiers,
      vectorMatching: {
        ...this.modifiers.vectorMatching,
        include: labels,
        cardinality: VectorCardinality.OneToMany,
      },
    });
  }

  groupRight<TNextInclude extends Array<keyof TLabels & string>>(
    ...labels: TNextInclude
  ): InstantVector<
    TLabels,
    TOn,
    TMatchingLabels,
    TNextInclude,
    VectorCardinality.ManyToOne,
    TWithout,
    TGroupingLabels,
    TBool
  > {
    return new InstantVector(this.time, this.signatures, {
      ...this.modifiers,
      vectorMatching: {
        ...this.modifiers.vectorMatching,
        include: labels,
        cardinality: VectorCardinality.ManyToOne,
      },
    });
  }

  bool(): InstantVector<
    TLabels,
    TOn,
    TMatchingLabels,
    TInclude,
    TVectorCardinality,
    TWithout,
    TGroupingLabels,
    true
  > {
    return new InstantVector(this.time, this.signatures, {
      ...this.modifiers,
      binary: {
        bool: true,
      },
    });
  }

  push(sample: Sample<TLabels>) {
    const sig = sample.sig();
    if (this.signatures.has(sig)) {
      throw new Error(
        `Duplicated samples found, have to be unique: ${JSON.stringify(sample.labels.record)}`
      );
    }
    this.signatures.set(sig, sample);
    this.samples.push(sample);
  }

  public get empty() {
    return this.samples.length === 0;
  }

  getModifiers() {
    return this.modifiers;
  }
}
