/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseInterval } from '../../../../../../../src/plugins/data/common';

export function getSteps({
  step,
  from,
  to,
  max,
}: {
  step: string;
  from: number;
  to: number;
  max: number;
}) {
  const stepInMs = parseInterval(step)!.asMilliseconds();
  const steps = Math.min(max, Math.ceil((to - from) / stepInMs));

  return new Array(steps).fill(undefined).map((_, index) => {
    return {
      index,
      time: to - index * stepInMs,
    };
  });
}
