/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
