/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LabelSet } from './label_set';
import { MatchLabels } from './types';

export class Sample<TLabels extends Record<string, string> = Record<string, string>> {
  constructor(public readonly labels: LabelSet<TLabels>, public readonly value: number) {}

  sig<TOn extends boolean, TMatchingLabels extends Array<keyof TLabels & string>>(match?: {
    matchingLabels: TMatchingLabels;
    on: TOn;
  }) {
    return this.labels.sig(match);
  }

  drop<TOn extends boolean, TMatchingLabels extends Array<keyof TLabels & string>>(match: {
    matchingLabels: TMatchingLabels;
    on: TOn;
  }): Sample<MatchLabels<TLabels, TOn, TMatchingLabels>> {
    return !match.on && match.matchingLabels.length
      ? (this as any)
      : new Sample(this.labels.drop(match), this.value);
  }
}
