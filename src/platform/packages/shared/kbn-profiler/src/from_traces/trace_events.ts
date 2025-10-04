/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TraceEvent } from './types';

export function getEventEnd(event: TraceEvent): number {
  return event.timestampUs + event.durationUs;
}

export function getAncestorChain(
  event: TraceEvent,
  eventsById: Map<string, TraceEvent>
): TraceEvent[] {
  const ancestors: TraceEvent[] = [];
  let currentParentId = event.parentId;
  const seen = new Set<string>([event.id]);

  while (currentParentId) {
    if (seen.has(currentParentId)) {
      break;
    }

    const parent = eventsById.get(currentParentId);
    if (!parent) {
      break;
    }
    ancestors.unshift(parent);
    seen.add(parent.id);
    currentParentId = parent.parentId;
  }

  return ancestors;
}
