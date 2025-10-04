/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { LOG_INTERVAL_MS } from './constants';
import { createTraceAccumulator } from './trace_accumulator';
import type { TraceEvent } from './types';

const baseEvent: TraceEvent = {
  id: 'root',
  traceId: 'trace',
  timestampUs: 0,
  durationUs: 100,
  name: 'Root',
  kind: 'transaction',
};

function createLogger(): Logger {
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    get: jest.fn(),
    isLevelEnabled: jest.fn(() => true),
  };

  logger.get.mockReturnValue(logger);

  return logger as unknown as Logger;
}

describe('createTraceAccumulator', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores unique events and exposes them via getters', () => {
    const logger = createLogger();
    const accumulator = createTraceAccumulator({ logger, maxDocs: 5 });

    expect(accumulator.count).toBe(0);
    expect(accumulator.getEvents().size).toBe(0);

    const added = accumulator.add(baseEvent);
    expect(added).toBe(true);
    expect(accumulator.count).toBe(1);
    expect(accumulator.getEvents().get('root')).toEqual(baseEvent);
  });

  it('tracks parent-child relationships and ignores duplicates', () => {
    const logger = createLogger();
    const accumulator = createTraceAccumulator({ logger, maxDocs: 5 });

    const child: TraceEvent = {
      id: 'child',
      parentId: 'root',
      traceId: 'trace',
      timestampUs: 10,
      durationUs: 20,
      name: 'Child',
      kind: 'span',
    };

    expect(accumulator.add(baseEvent)).toBe(true);
    expect(accumulator.add(child)).toBe(true);
    // Duplicate should be ignored but return true to allow fetch loop continuation
    expect(accumulator.add(child)).toBe(true);

    const children = accumulator.getChildrenMap().get('root');
    expect(children).toBeDefined();
    expect(children?.has('child')).toBe(true);
    expect(children?.size).toBe(1);
    expect(accumulator.count).toBe(2);
  });

  it('stops accepting new events when the maximum is reached', () => {
    const logger = createLogger();
    const accumulator = createTraceAccumulator({ logger, maxDocs: 2 });

    const firstAdd = accumulator.add(baseEvent);
    const secondAdd = accumulator.add({
      ...baseEvent,
      id: 'second',
    });

    expect(firstAdd).toBe(true);
    expect(secondAdd).toBe(false);
    expect(accumulator.isFull).toBe(true);
    expect(accumulator.count).toBe(2);

    const thirdAdd = accumulator.add({
      ...baseEvent,
      id: 'third',
    });

    expect(thirdAdd).toBe(false);
    expect(accumulator.count).toBe(2);
  });

  it('logs progress when the reporting interval elapses', () => {
    const logger = createLogger();

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(0); // accumulator initialization

    const accumulator = createTraceAccumulator({ logger, maxDocs: 5 });

    nowSpy.mockReturnValue(LOG_INTERVAL_MS);
    accumulator.add(baseEvent);

    expect(logger.info).toHaveBeenCalledWith('Collected 1 documents so far');

    nowSpy.mockReturnValue(LOG_INTERVAL_MS * 2);
    accumulator.add({
      ...baseEvent,
      id: 'second',
    });

    expect(logger.info).toHaveBeenCalledTimes(2);
  });
});
