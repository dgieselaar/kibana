/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
// @ts-ignore
import { calculateAuto } from './calculate_auto';
import { unitToSeconds } from './unit_to_seconds';

export function getBucketSize({
  start,
  end,
  minInterval,
}: {
  start: number;
  end: number;
  minInterval: string;
}) {
  const duration = moment.duration(end - start, 'ms');
  const bucketSize = Math.max(calculateAuto.near(100, duration).asSeconds(), 1);
  const intervalString = `${bucketSize}s`;
  const matches = minInterval && minInterval.match(/^([\d]+)([shmdwMy]|ms)$/);
  const minBucketSize = matches ? Number(matches[1]) * unitToSeconds(matches[2]) : 0;

  if (bucketSize < minBucketSize) {
    return {
      bucketSize: minBucketSize,
      intervalString: minInterval,
    };
  }

  return { bucketSize, intervalString };
}
