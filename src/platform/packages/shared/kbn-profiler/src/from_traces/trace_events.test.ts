/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAncestorChain, getEventEnd } from './trace_events';
import type { TraceEvent } from './types';

describe('trace event utilities', () => {
  const root: TraceEvent = {
    id: 'root',
    traceId: 'trace-1',
    name: 'Root',
    timestampUs: 100,
    durationUs: 50,
    kind: 'transaction',
  };

  const child: TraceEvent = {
    id: 'child',
    parentId: 'root',
    traceId: 'trace-1',
    name: 'Child',
    timestampUs: 120,
    durationUs: 10,
    kind: 'span',
  };

  const grandChild: TraceEvent = {
    id: 'grandchild',
    parentId: 'child',
    traceId: 'trace-1',
    name: 'Grand',
    timestampUs: 130,
    durationUs: 5,
    kind: 'span',
  };

  const eventsById = new Map([root, child, grandChild].map((event) => [event.id, event]));

  it('computes the inclusive end timestamp of an event', () => {
    expect(getEventEnd(root)).toBe(150);
    expect(getEventEnd(child)).toBe(130);
  });

  it('returns the ancestor chain excluding the event itself', () => {
    expect(getAncestorChain(grandChild, eventsById)).toEqual([root, child]);
    expect(getAncestorChain(child, eventsById)).toEqual([root]);
    expect(getAncestorChain(root, eventsById)).toEqual([]);
  });

  it('stops when encountering a missing parent', () => {
    const orphan: TraceEvent = {
      id: 'orphan',
      parentId: 'missing',
      traceId: 'trace-1',
      name: 'Orphan',
      timestampUs: 200,
      durationUs: 5,
      kind: 'span',
    };

    expect(getAncestorChain(orphan, eventsById)).toEqual([]);
  });

  it('halts when parents form a cycle', () => {
    const cyclicA: TraceEvent = {
      id: 'cyclicA',
      parentId: 'cyclicB',
      traceId: 'trace-1',
      name: 'Cyclic A',
      timestampUs: 210,
      durationUs: 5,
      kind: 'span',
    };

    const cyclicB: TraceEvent = {
      id: 'cyclicB',
      parentId: 'cyclicA',
      traceId: 'trace-1',
      name: 'Cyclic B',
      timestampUs: 215,
      durationUs: 5,
      kind: 'span',
    };

    const cyclicEvents = new Map(eventsById);
    cyclicEvents.set(cyclicA.id, cyclicA);
    cyclicEvents.set(cyclicB.id, cyclicB);

    expect(getAncestorChain(cyclicA, cyclicEvents)).toEqual([cyclicB]);
    expect(getAncestorChain(cyclicB, cyclicEvents)).toEqual([cyclicA]);
  });
});
