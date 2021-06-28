/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import hash from 'object-hash';
import { MatchLabels } from './types';
import { getLabelsToMatch } from './utils';

export class LabelSet<TLabels extends Record<string, string>> {
  constructor(public readonly record: TLabels) {}

  sig(match?: { matchingLabels: string[]; on: boolean }) {
    if (!match) {
      return hash(this.record);
    }

    const labels = getLabelsToMatch(this.record, match);
    return hash(labels);
  }

  drop<TOn extends boolean, TMatchingLabels extends Array<keyof TLabels & string>>(match: {
    matchingLabels: TMatchingLabels;
    on: TOn;
  }): LabelSet<MatchLabels<TLabels, TOn, TMatchingLabels>> {
    return !match.on && match.matchingLabels.length === 0
      ? ((this as unknown) as LabelSet<MatchLabels<TLabels, TOn, TMatchingLabels>>)
      : new LabelSet(getLabelsToMatch(this.record, match));
  }
}
