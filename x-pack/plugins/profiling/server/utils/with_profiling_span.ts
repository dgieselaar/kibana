/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { withSpan, SpanOptions, parseSpanOptions } from '@kbn/apm-utils';

const RESOLUTION = 5;
const LIMIT = 10;

export function createEventLoopDelayMonitor(name: string) {
  let start = performance.now();
  let enabled = true;

  let total: number = 0;

  function measure() {
    const timeOverLimit = performance.now() - start - RESOLUTION;
    const exceeds = timeOverLimit > LIMIT;
    if (exceeds) {
      total += timeOverLimit;
    }

    start = performance.now();

    if (enabled) {
      setTimeout(measure, RESOLUTION);
    }
  }

  setTimeout(measure, RESOLUTION);

  return {
    stop() {
      enabled = false;
      measure();
      console.log(name + ': measured total event loop delay of ' + Math.round(total) + 'ms');
    },
  };
}

export function withProfilingSpan<T>(
  optionsOrName: SpanOptions | string,
  cb: () => Promise<T>
): Promise<T> {
  const options = parseSpanOptions(optionsOrName);

  const optionsWithDefaults = {
    ...(options.intercept ? {} : { type: 'plugin:profiling' }),
    ...options,
    labels: {
      plugin: 'profiling',
      ...options.labels,
    },
  };

  return withSpan(optionsWithDefaults, cb);
}
