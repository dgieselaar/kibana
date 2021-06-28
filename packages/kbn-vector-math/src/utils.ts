/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { omit, pick } from 'lodash';
import { InstantVector } from './instant_vector';
import { MatchLabels } from './types';

export function getLabelsToMatch<
  TLabels extends Record<string, string>,
  TOn extends boolean,
  TMatchingLabels extends Array<keyof TLabels & string>
>(
  labels: TLabels,
  match: { matchingLabels: TMatchingLabels; on: TOn }
): MatchLabels<TLabels, TOn, TMatchingLabels> {
  if (!match) {
    return labels as any;
  }

  if (!match.on) {
    return omit(labels, match.matchingLabels) as any;
  }

  return pick(labels, match.matchingLabels) as any;
}

export const isInstantVector = (input: unknown): input is InstantVector => {
  return input instanceof InstantVector;
};
