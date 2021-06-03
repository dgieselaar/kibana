/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LabelSet } from './label_set';
import { VectorMatching } from './types';

export class Sample {
  constructor(public readonly labels: LabelSet, public readonly value: number) {}

  sig(match?: Pick<VectorMatching, 'matchingLabels' | 'on'>) {
    return this.labels.sig(match);
  }

  drop(match: Pick<VectorMatching, 'matchingLabels' | 'on'>) {
    return !match.on && match.matchingLabels.length
      ? this
      : new Sample(this.labels.drop(match), this.value);
  }
}
