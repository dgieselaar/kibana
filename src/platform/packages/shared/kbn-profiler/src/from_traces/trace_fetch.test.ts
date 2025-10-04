/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import { traceFetchTestUtils } from './trace_fetch';

function createHit(source: Record<string, unknown>): SearchHit<Record<string, unknown>> {
  return {
    _index: 'test-index',
    _id: 'test-id',
    _score: null,
    _source: source,
  } as unknown as SearchHit<Record<string, unknown>>;
}

describe('mapHitToTraceEvent', () => {
  it('prefers transaction ids for transaction documents', () => {
    const hit = createHit({
      processor: { event: 'transaction' },
      transaction: {
        id: 'txn-id',
        name: 'RUN config.logs_essentials.ts',
        type: 'app',
        duration: { us: 75_000 },
      },
      span: {
        id: 'span-root',
      },
      service: {
        name: 'kibana-functional-tests',
      },
      trace: {
        id: 'trace-1',
      },
      '@timestamp': 1_000_000,
    });

    const event = traceFetchTestUtils.mapHitToTraceEvent(hit);
    expect(event).not.toBeNull();
    expect(event?.id).toBe('txn-id');
    expect(event?.kind).toBe('transaction');
    expect(event?.type).toBe('app');
    expect(event?.parentId).toBeUndefined();
    expect(event?.serviceName).toBe('kibana-functional-tests');
  });

  it('maps span documents using span ids and parent linkage', () => {
    const hit = createHit({
      processor: { event: 'span' },
      span: {
        id: 'span-child',
        name: 'child-span',
        type: 'task',
        subtype: 'work',
        duration: { us: 12_000 },
      },
      transaction: {
        id: 'txn-id',
      },
      parent: {
        id: 'txn-id',
      },
      service: {
        name: 'kibana-functional-tests',
      },
      trace: {
        id: 'trace-1',
      },
      '@timestamp': 1_005_000,
    });

    const event = traceFetchTestUtils.mapHitToTraceEvent(hit);
    expect(event).not.toBeNull();
    expect(event?.id).toBe('span-child');
    expect(event?.kind).toBe('span');
    expect(event?.parentId).toBe('txn-id');
    expect(event?.subtype).toBe('work');
    expect(event?.serviceName).toBe('kibana-functional-tests');
  });
});
