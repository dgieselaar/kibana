/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pick } from 'lodash';
import { VectorCardinality } from './constants';
import { AggregateOperator, BinaryOperator, VectorMatching } from './types';
import { Sample } from './sample';
import { LabelSet } from './label_set';

export class InstantVector {
  private modifiers: {
    vectorMatching: VectorMatching;
    aggregate: {
      grouping: string[];
      without: boolean;
    };
    binary: {
      bool: boolean;
    };
  } = {
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
  };

  constructor(public readonly time: number, public readonly samples: Sample[]) {}

  binop(left: InstantVector, operator: BinaryOperator): InstantVector {
    let right: InstantVector = this;

    const isOneToOne = this.modifiers.vectorMatching.cardinality === VectorCardinality.OneToOne;
    const swap = this.modifiers.vectorMatching.cardinality === VectorCardinality.OneToMany;
    const bool = this.modifiers.binary.bool;

    if (swap) {
      [left, right] = [right, left];
    }

    const rightSamples: Map<string, Sample> = new Map();
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

    const samples: Map<string, Sample> = new Map();

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

    return new InstantVector(this.time, Array.from(samples.values()));
  }

  aggregate(op: AggregateOperator) {
    if (this.modifiers.aggregate.grouping.length === 0 && !this.modifiers.aggregate.without) {
      return op(this.samples.map((sample) => sample.value));
    }

    const groups: Map<string, { labels: LabelSet; values: number[] }> = new Map();
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
    );
  }

  ignore(labels: string[]) {
    this.modifiers.vectorMatching.matchingLabels = labels;
    this.modifiers.vectorMatching.on = false;
    return this;
  }

  on(labels: string[]) {
    this.modifiers.vectorMatching.matchingLabels = labels;
    this.modifiers.vectorMatching.on = true;
    return this;
  }

  without(labels: string[]) {
    this.modifiers.aggregate.grouping = labels;
    this.modifiers.aggregate.without = true;
    return this;
  }

  by(labels: string[]) {
    this.modifiers.aggregate.grouping = labels.concat();
    this.modifiers.aggregate.without = false;

    return this;
  }

  groupLeft(labels: string[]) {
    this.modifiers.vectorMatching.include = labels;
    this.modifiers.vectorMatching.cardinality = VectorCardinality.ManyToOne;
    return this;
  }

  groupRight(labels: string[]) {
    this.modifiers.vectorMatching.include = labels;
    this.modifiers.vectorMatching.cardinality = VectorCardinality.OneToMany;
    return this;
  }

  bool() {
    this.modifiers.binary.bool = true;
    return this;
  }

  push(sample: Sample) {
    this.samples.push(sample);
  }

  public get empty() {
    return this.samples.length === 0;
  }

  getModifiers() {
    return this.modifiers;
  }
}
