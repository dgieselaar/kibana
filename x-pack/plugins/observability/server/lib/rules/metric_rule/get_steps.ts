/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseInterval } from '../../../../../../../src/plugins/data/common';

interface Options {
  to: number;
  max: number;
  from?: number;
  step?: string;
}

export function getSteps({ step, from, to, max }: Options) {
  if (!from && !step) {
    return [
      {
        index: 0,
        time: to,
      },
    ];
  }

  const stepInMs = step ? parseInterval(step)!.asMilliseconds() : to - from!;

  if (!from) {
    from = to - stepInMs;
  }

  const steps = Math.min(max, Math.ceil((to - from) / stepInMs));

  return new Array(steps)
    .fill(undefined)
    .map((_, index) => {
      return {
        time: to - index * stepInMs,
      };
    })
    .reverse();
}
