/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import hash from 'object-hash';
import { VectorMatching } from './types';
import { getLabelsToMatch } from './utils';

export class LabelSet {
  constructor(public readonly record: Record<string, string>) {}

  sig(match?: Pick<VectorMatching, 'matchingLabels' | 'on'>) {
    if (!match) {
      return hash(this.record);
    }

    const labels = getLabelsToMatch(this.record, match);
    return hash(labels);
  }

  drop(match: Pick<VectorMatching, 'matchingLabels' | 'on'>) {
    return !match.on && match.matchingLabels.length === 0
      ? this
      : new LabelSet(getLabelsToMatch(this.record, match));
  }
}
