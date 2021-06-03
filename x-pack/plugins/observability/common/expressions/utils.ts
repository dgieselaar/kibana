/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import { InstantVector } from './instant_vector';
import { VectorMatching } from './types';

export const getLabelsToMatch = (
  labels: Record<string, string>,
  match: Pick<VectorMatching, 'matchingLabels' | 'on'>
) => {
  if (!match) {
    return labels;
  }

  if (!match.on) {
    return omit(labels, match.matchingLabels);
  }

  return pick(labels, match.matchingLabels);
};

export const isInstantVector = (input: unknown): input is InstantVector => {
  return input instanceof InstantVector;
};
