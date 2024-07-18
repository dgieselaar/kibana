/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Minimatch } from 'minimatch';

export function createDatasetMatcher(pattern: string) {
  const matcher = new Minimatch(pattern.trim() + '*');

  return {
    filter: (datasets: string[]) => {
      return datasets.filter((dataset) => matcher.match(dataset));
    },
    match: (dataset: string) => {
      return matcher.match(dataset);
    },
  };
}
