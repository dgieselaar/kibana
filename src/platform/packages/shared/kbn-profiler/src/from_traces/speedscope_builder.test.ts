/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';

import { buildSpeedscopeFile } from './speedscope_builder';
import type { TraceAccumulator, TraceEvent } from './types';

function createAccumulator(events: TraceEvent[]): TraceAccumulator {
  const map = new Map(events.map((event) => [event.id, event]));
  const childrenMap = new Map<string, Set<string>>();

  for (const event of events) {
    if (!event.parentId) {
      continue;
    }

    if (!childrenMap.has(event.parentId)) {
      childrenMap.set(event.parentId, new Set());
    }

    childrenMap.get(event.parentId)!.add(event.id);
  }

  return {
    add: () => {
      throw new Error('Not implemented for tests');
    },
    getEvents: () => map,
    getChildrenMap: () => childrenMap,
    get isFull() {
      return false;
    },
    get count() {
      return map.size;
    },
  };
}

function summarize(profileEvents: ReturnType<typeof buildSpeedscopeFile>) {
  if (!profileEvents) {
    return null;
  }

  const profile = profileEvents.profiles[0];
  const frames = profileEvents.shared.frames;
  return profile.events.map((event) => ({
    type: event.type,
    frame: frames[event.frame]?.name,
    category: frames[event.frame]?.category,
    at: event.at,
  }));
}

function createLoggerMock(): jest.Mocked<Logger> {
  const logger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
    get: jest.fn(),
    isLevelEnabled: jest.fn(() => true),
  } as Partial<Logger> as jest.Mocked<Logger>;

  logger.get.mockReturnValue(logger as unknown as Logger);

  return logger;
}

describe('buildSpeedscopeFile', () => {
  const root: TraceEvent = {
    id: 'root',
    traceId: 'trace-1',
    name: 'Root Transaction',
    timestampUs: 0,
    durationUs: 100,
    kind: 'transaction',
    type: 'app',
    serviceName: 'run_tests',
  };

  it('returns null when the accumulator is empty', () => {
    const profile = buildSpeedscopeFile(createAccumulator([]));
    expect(profile).toBeNull();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits open and close events for nested spans in order', () => {
    const child: TraceEvent = {
      id: 'child',
      parentId: 'root',
      traceId: 'trace-1',
      name: 'Child Span',
      timestampUs: 10,
      durationUs: 40,
      kind: 'span',
      type: 'service',
      subtype: 'downstream',
      serviceName: 'worker-service',
    };

    const leaf: TraceEvent = {
      id: 'leaf',
      parentId: 'child',
      traceId: 'trace-1',
      name: 'Leaf Span',
      timestampUs: 20,
      durationUs: 10,
      kind: 'span',
      type: 'db',
      subtype: 'query',
      serviceName: 'leaf-service',
    };

    const profile = buildSpeedscopeFile(createAccumulator([root, child, leaf]));

    expect(summarize(profile)).toEqual([
      { type: 'O', frame: 'run_tests: Root Transaction', category: 'app', at: 0 },
      {
        type: 'O',
        frame: 'worker-service: Child Span',
        category: 'service:downstream',
        at: 10,
      },
      { type: 'O', frame: 'leaf-service: Leaf Span', category: 'db:query', at: 20 },
      { type: 'C', frame: 'leaf-service: Leaf Span', category: 'db:query', at: 30 },
      {
        type: 'C',
        frame: 'worker-service: Child Span',
        category: 'service:downstream',
        at: 50,
      },
      { type: 'C', frame: 'run_tests: Root Transaction', category: 'app', at: 100 },
    ]);
  });

  it('serializes overlapping siblings sequentially on the virtual thread', () => {
    const firstChild: TraceEvent = {
      id: 'firstChild',
      parentId: 'root',
      traceId: 'trace-1',
      name: 'First Child',
      timestampUs: 0,
      durationUs: 60,
      kind: 'span',
      type: 'work',
      serviceName: 'first-service',
    };

    const secondChild: TraceEvent = {
      id: 'secondChild',
      parentId: 'root',
      traceId: 'trace-1',
      name: 'Second Child',
      timestampUs: 20,
      durationUs: 60,
      kind: 'span',
      type: 'work',
      serviceName: 'second-service',
    };

    const profile = buildSpeedscopeFile(createAccumulator([root, firstChild, secondChild]));

    expect(summarize(profile)).toEqual([
      { type: 'O', frame: 'run_tests: Root Transaction', category: 'app', at: 0 },
      { type: 'O', frame: 'first-service: First Child', category: 'work', at: 0 },
      { type: 'C', frame: 'first-service: First Child', category: 'work', at: 60 },
      { type: 'O', frame: 'second-service: Second Child', category: 'work', at: 60 },
      { type: 'C', frame: 'second-service: Second Child', category: 'work', at: 80 },
      { type: 'C', frame: 'run_tests: Root Transaction', category: 'app', at: 100 },
    ]);
  });

  it('keeps spans from traces without root transactions grouped by trace id', () => {
    const orphanParent: TraceEvent = {
      id: 'orphanParent',
      parentId: 'missing-root',
      traceId: 'trace-missing-root',
      name: 'Orphan Parent',
      timestampUs: 0,
      durationUs: 80,
      kind: 'span',
      type: 'worker',
      serviceName: 'service-a',
    };

    const orphanChild: TraceEvent = {
      id: 'orphanChild',
      parentId: 'orphanParent',
      traceId: 'trace-missing-root',
      name: 'Nested Orphan',
      timestampUs: 10,
      durationUs: 10,
      kind: 'span',
      type: 'worker',
      serviceName: 'service-a',
    };

    const orphanSibling: TraceEvent = {
      id: 'orphanSibling',
      parentId: 'missing-root',
      traceId: 'trace-missing-root',
      name: 'Orphan Sibling',
      timestampUs: 40,
      durationUs: 80,
      kind: 'span',
      type: 'background',
      serviceName: 'service-b',
    };

    const profile = buildSpeedscopeFile(
      createAccumulator([orphanParent, orphanChild, orphanSibling])
    );

    expect(summarize(profile)).toEqual([
      { type: 'O', frame: 'service-a: Orphan Parent', category: 'worker', at: 0 },
      { type: 'O', frame: 'service-a: Nested Orphan', category: 'worker', at: 10 },
      { type: 'C', frame: 'service-a: Nested Orphan', category: 'worker', at: 20 },
      { type: 'C', frame: 'service-a: Orphan Parent', category: 'worker', at: 80 },
      { type: 'O', frame: 'service-b: Orphan Sibling', category: 'background', at: 80 },
      { type: 'C', frame: 'service-b: Orphan Sibling', category: 'background', at: 120 },
    ]);
  });

  it('keeps parent spans on the stack when their timestamp lags behind a child', () => {
    const skewedParent: TraceEvent = {
      ...root,
      id: 'skewedParent',
      name: 'Parent with clock skew',
      timestampUs: 10,
    };

    const earlyChild: TraceEvent = {
      id: 'earlyChild',
      parentId: 'skewedParent',
      traceId: 'trace-1',
      name: 'Early Child',
      timestampUs: 0,
      durationUs: 30,
      kind: 'span',
      type: 'child',
      serviceName: 'skew-child-service',
    };

    const profile = buildSpeedscopeFile(createAccumulator([skewedParent, earlyChild]));

    expect(summarize(profile)).toEqual([
      { type: 'O', frame: 'run_tests: Parent with clock skew', category: 'app', at: 0 },
      { type: 'O', frame: 'skew-child-service: Early Child', category: 'child', at: 0 },
      { type: 'C', frame: 'skew-child-service: Early Child', category: 'child', at: 30 },
      { type: 'C', frame: 'run_tests: Parent with clock skew', category: 'app', at: 110 },
    ]);
  });

  it('concatenates traces sequentially so root transactions do not overlap', () => {
    const laterRoot: TraceEvent = {
      id: 'laterRoot',
      traceId: 'trace-a',
      name: 'Later Root Transaction',
      timestampUs: 100,
      durationUs: 40,
      kind: 'transaction',
      type: 'task',
      serviceName: 'later-service',
    };

    const laterChild: TraceEvent = {
      id: 'laterChild',
      parentId: 'laterRoot',
      traceId: 'trace-a',
      name: 'Later Child Span',
      timestampUs: 110,
      durationUs: 10,
      kind: 'span',
      type: 'work',
      serviceName: 'later-worker',
    };

    const earlierRoot: TraceEvent = {
      id: 'earlierRoot',
      traceId: 'trace-b',
      name: 'Earlier Root Transaction',
      timestampUs: 90,
      durationUs: 20,
      kind: 'transaction',
      type: 'task',
      serviceName: 'earlier-service',
    };

    const earlierChild: TraceEvent = {
      id: 'earlierChild',
      parentId: 'earlierRoot',
      traceId: 'trace-b',
      name: 'Earlier Child Span',
      timestampUs: 95,
      durationUs: 5,
      kind: 'span',
      type: 'work',
      serviceName: 'earlier-worker',
    };

    const profile = buildSpeedscopeFile(
      createAccumulator([laterRoot, laterChild, earlierRoot, earlierChild])
    );

    expect(summarize(profile)).toEqual([
      { type: 'O', frame: 'earlier-service: Earlier Root Transaction', category: 'task', at: 0 },
      { type: 'O', frame: 'earlier-worker: Earlier Child Span', category: 'work', at: 5 },
      { type: 'C', frame: 'earlier-worker: Earlier Child Span', category: 'work', at: 10 },
      { type: 'C', frame: 'earlier-service: Earlier Root Transaction', category: 'task', at: 20 },
      { type: 'O', frame: 'later-service: Later Root Transaction', category: 'task', at: 20 },
      { type: 'O', frame: 'later-worker: Later Child Span', category: 'work', at: 30 },
      { type: 'C', frame: 'later-worker: Later Child Span', category: 'work', at: 40 },
      { type: 'C', frame: 'later-service: Later Root Transaction', category: 'task', at: 60 },
    ]);
  });

  it('emits zero-duration spans as instantaneous open/close pairs without affecting the stack', () => {
    const instant: TraceEvent = {
      id: 'instant',
      parentId: 'root',
      traceId: 'trace-1',
      name: 'Instant Span',
      timestampUs: 5,
      durationUs: 0,
      kind: 'span',
      type: 'work',
      serviceName: 'instant-service',
    };

    const profile = buildSpeedscopeFile(createAccumulator([root, instant]));

    expect(summarize(profile)).toEqual([
      { type: 'O', frame: 'run_tests: Root Transaction', category: 'app', at: 0 },
      { type: 'O', frame: 'instant-service: Instant Span', category: 'work', at: 5 },
      { type: 'C', frame: 'instant-service: Instant Span', category: 'work', at: 5 },
      { type: 'C', frame: 'run_tests: Root Transaction', category: 'app', at: 100 },
    ]);
  });

  it('uses span kind as category when type and subtype are missing', () => {
    const spanWithoutType: TraceEvent = {
      id: 'noType',
      parentId: 'root',
      traceId: 'trace-1',
      name: 'No Type',
      timestampUs: 10,
      durationUs: 10,
      kind: 'span',
    };

    const profile = buildSpeedscopeFile(createAccumulator([root, spanWithoutType]));

    expect(summarize(profile)).toEqual([
      { type: 'O', frame: 'run_tests: Root Transaction', category: 'app', at: 0 },
      { type: 'O', frame: 'No Type', category: 'span', at: 10 },
      { type: 'C', frame: 'No Type', category: 'span', at: 20 },
      { type: 'C', frame: 'run_tests: Root Transaction', category: 'app', at: 100 },
    ]);
  });

  it('reuses frames for repeated spans with identical name and category', () => {
    const spanA: TraceEvent = {
      id: 'spanA',
      parentId: 'root',
      traceId: 'trace-1',
      name: 'Repeated Span',
      timestampUs: 10,
      durationUs: 10,
      kind: 'span',
      type: 'db',
      serviceName: 'db-service',
    };

    const spanB: TraceEvent = {
      ...spanA,
      id: 'spanB',
      timestampUs: 30,
    };

    const profile = buildSpeedscopeFile(createAccumulator([root, spanA, spanB]));

    const events = summarize(profile);
    expect(events).not.toBeNull();

    const frames = profile!.shared.frames;
    const frameIndices = profile!.profiles[0].events
      .filter((event) => frames[event.frame]?.name === 'db-service: Repeated Span')
      .map((event) => event.frame);

    expect(new Set(frameIndices).size).toBe(1);
  });

  it('logs progress in roughly 10% increments when a logger is provided', () => {
    const logger = createLoggerMock();

    let currentMs = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      const value = currentMs;
      currentMs += 5_000;
      return value;
    });

    const longRoot: TraceEvent = {
      id: 'longRoot',
      traceId: 'trace-long',
      name: 'Long Transaction',
      timestampUs: 0,
      durationUs: 30_000_000,
      kind: 'transaction',
      type: 'task',
      serviceName: 'long-service',
    };

    const earlyWork: TraceEvent = {
      id: 'earlyWork',
      parentId: 'longRoot',
      traceId: 'trace-long',
      name: 'Early Work',
      timestampUs: 3_500_000,
      durationUs: 250_000,
      kind: 'span',
      type: 'work',
      serviceName: 'worker-a',
    };

    const midWork: TraceEvent = {
      id: 'midWork',
      parentId: 'longRoot',
      traceId: 'trace-long',
      name: 'Mid Work',
      timestampUs: 12_000_000,
      durationUs: 500_000,
      kind: 'span',
      type: 'work',
      serviceName: 'worker-b',
    };

    const lateWork: TraceEvent = {
      id: 'lateWork',
      parentId: 'longRoot',
      traceId: 'trace-long',
      name: 'Late Work',
      timestampUs: 25_000_000,
      durationUs: 250_000,
      kind: 'span',
      type: 'work',
      serviceName: 'worker-c',
    };

    const profile = buildSpeedscopeFile(
      createAccumulator([longRoot, earlyWork, midWork, lateWork]),
      logger
    );

    expect(profile).not.toBeNull();
    expect(logger.info).toHaveBeenCalled();

    const messages = logger.info.mock.calls.map(([message]) => String(message));
    expect(messages.at(-1)).toContain('100.0%');
    expect(messages.some((msg) => /\d+\.\d%/.test(msg))).toBe(true);
    expect(messages.some((msg) => /\d+\.\d{2}s elapsed/.test(msg))).toBe(true);
    expect(messages.some((msg) => msg.includes('11.7%'))).toBe(true);
  });

  it('logs progress when wall clock thresholds elapse without percent changes', () => {
    const logger = createLoggerMock();

    let currentMs = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      const value = currentMs;
      currentMs += 12_000;
      return value;
    });

    const longRoot: TraceEvent = {
      id: 'longRoot',
      traceId: 'trace-long',
      name: 'Long Transaction',
      timestampUs: 0,
      durationUs: 120_000_000,
      kind: 'transaction',
      type: 'task',
      serviceName: 'long-service',
    };

    const shortSpan: TraceEvent = {
      id: 'shortSpan',
      parentId: 'longRoot',
      traceId: 'trace-long',
      name: 'Short Span',
      timestampUs: 100_000,
      durationUs: 100_000,
      kind: 'span',
      type: 'work',
      serviceName: 'worker',
    };

    const profile = buildSpeedscopeFile(createAccumulator([longRoot, shortSpan]), logger);

    expect(profile).not.toBeNull();
    expect(logger.info).toHaveBeenCalled();

    const messages = logger.info.mock.calls.map(([message]) => String(message));
    expect(messages[0]).toContain('0.0%');
    expect(messages[0]).toContain('12.00s elapsed');
    expect(messages.at(-1)).toContain('100.0%');
  });
});
