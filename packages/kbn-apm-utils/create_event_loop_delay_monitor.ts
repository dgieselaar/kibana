/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function createEventLoopDelayMonitor(
  options: {
    resolution?: number;
    limit?: number;
  } = {}
) {
  const { resolution = 5, limit = 10 } = options;
  let start = performance.now();
  let enabled = true;

  let total: number = 0;

  function measure() {
    const timeOverLimit = performance.now() - start - resolution;
    const exceeds = timeOverLimit > limit;
    if (exceeds) {
      total += timeOverLimit;
    }

    start = performance.now();

    if (enabled) {
      setTimeout(measure, resolution);
    }
  }

  setTimeout(measure, resolution);

  return {
    get total() {
      return total;
    },
    stop() {
      enabled = false;
      measure();
    },
  };
}
