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
import type { TraceAccumulator, TraceEvent } from './types';

export function createTraceAccumulator({
  logger,
  maxDocs,
}: {
  logger: Logger;
  maxDocs: number;
}): TraceAccumulator {
  const events = new Map<string, TraceEvent>();
  const children = new Map<string, Set<string>>();
  let count = 0;
  let isFull = false;
  let lastLoggedAt = Date.now();

  const add = (event: TraceEvent) => {
    if (isFull) {
      return false;
    }

    if (events.has(event.id)) {
      return true;
    }

    events.set(event.id, event);
    count += 1;

    if (event.parentId) {
      if (!children.has(event.parentId)) {
        children.set(event.parentId, new Set());
      }
      children.get(event.parentId)!.add(event.id);
    }

    const now = Date.now();
    if (now - lastLoggedAt >= LOG_INTERVAL_MS) {
      logger.info(`Collected ${count} documents so far`);
      lastLoggedAt = now;
    }

    if (count >= maxDocs) {
      isFull = true;
      return false;
    }

    return true;
  };

  return {
    add,
    getEvents: () => events,
    getChildrenMap: () => children,
    get isFull() {
      return isFull;
    },
    get count() {
      return count;
    },
  };
}
