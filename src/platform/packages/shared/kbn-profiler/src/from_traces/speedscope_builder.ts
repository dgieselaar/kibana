/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';

import { SPEEDSCOPE_SCHEMA_URL } from './constants';
import { getAncestorChain, getEventEnd } from './trace_events';
import type {
  SpeedscopeEvent,
  SpeedscopeFile,
  SpeedscopeFrame,
  TraceAccumulator,
  TraceEvent,
} from './types';

export function buildSpeedscopeFile(
  accumulator: TraceAccumulator,
  logger?: Logger,
  signal?: AbortSignal
): SpeedscopeFile | null {
  const eventsById = accumulator.getEvents();
  if (!eventsById.size) {
    return null;
  }

  interface EventTimeline {
    event: TraceEvent;
    start: number;
    end: number;
    stack: TraceEvent[];
  }

  const eventTimelineById = new Map<string, EventTimeline>();
  const childrenById = accumulator.getChildrenMap();

  for (const event of eventsById.values()) {
    const start = event.timestampUs;
    const end = getEventEnd(event);
    const ancestors = getAncestorChain(event, eventsById);
    const stack = [...ancestors, event];

    const timeline: EventTimeline = {
      event,
      start,
      end,
      stack,
    };

    eventTimelineById.set(event.id, timeline);
  }

  if (signal?.aborted) {
    return null;
  }

  const normalizationCache = new Map<string, { start: number; end: number }>();
  const inProgress = new Set<string>();

  const normalizeTimeline = (eventId: string): { start: number; end: number } => {
    const cached = normalizationCache.get(eventId);
    if (cached) {
      return cached;
    }

    if (inProgress.has(eventId)) {
      return {
        start: Number.POSITIVE_INFINITY,
        end: Number.NEGATIVE_INFINITY,
      };
    }

    const timeline = eventTimelineById.get(eventId);
    if (!timeline) {
      return {
        start: Number.POSITIVE_INFINITY,
        end: Number.NEGATIVE_INFINITY,
      };
    }

    inProgress.add(eventId);

    let normalizedStart = timeline.start;
    let normalizedEnd = timeline.end;

    const childIds = childrenById.get(eventId);
    if (childIds?.size) {
      for (const childId of childIds) {
        const childRange = normalizeTimeline(childId);
        if (Number.isFinite(childRange.start) && childRange.start < normalizedStart) {
          normalizedStart = childRange.start;
        }
        if (Number.isFinite(childRange.end) && childRange.end > normalizedEnd) {
          normalizedEnd = childRange.end;
        }
      }
    }

    inProgress.delete(eventId);

    timeline.start = normalizedStart;
    timeline.end = normalizedEnd;

    const result = { start: normalizedStart, end: normalizedEnd };
    normalizationCache.set(eventId, result);
    return result;
  };

  for (const eventId of eventTimelineById.keys()) {
    normalizeTimeline(eventId);
  }

  interface TraceGroup {
    id: string;
    eventIds: string[];
    start: number;
    end: number;
  }

  const traceGroups = new Map<string, TraceGroup>();
  const TRACE_GROUP_PREFIX = 'trace:';

  const getTraceGroupId = (timeline: EventTimeline): string => {
    const topOfStack = timeline.stack.length ? timeline.stack[0] : timeline.event;
    if (topOfStack.parentId && !eventTimelineById.has(topOfStack.parentId)) {
      return `${TRACE_GROUP_PREFIX}${timeline.event.traceId}`;
    }
    return topOfStack.id;
  };

  for (const [eventId, timeline] of eventTimelineById.entries()) {
    const groupId = getTraceGroupId(timeline);

    let group = traceGroups.get(groupId);
    if (!group) {
      group = {
        id: groupId,
        eventIds: [],
        start: Number.POSITIVE_INFINITY,
        end: Number.NEGATIVE_INFINITY,
      };
      traceGroups.set(groupId, group);
    }

    group.eventIds.push(eventId);
    if (Number.isFinite(timeline.start) && timeline.start < group.start) {
      group.start = timeline.start;
    }
    if (Number.isFinite(timeline.end) && timeline.end > group.end) {
      group.end = timeline.end;
    }
  }

  if (signal?.aborted) {
    return null;
  }

  const orderedGroups = Array.from(traceGroups.values())
    .filter((group) => Number.isFinite(group.start) && Number.isFinite(group.end))
    .sort((a, b) => {
      if (a.start === b.start) {
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      }
      return a.start - b.start;
    });

  let groupOffset = 0;

  for (const group of orderedGroups) {
    const groupDuration = Math.max(0, group.end - group.start);
    const shift = groupOffset - group.start;

    if (shift !== 0) {
      for (const eventId of group.eventIds) {
        const timeline = eventTimelineById.get(eventId);
        if (!timeline) {
          continue;
        }

        if (Number.isFinite(timeline.start)) {
          timeline.start += shift;
        }
        if (Number.isFinite(timeline.end)) {
          timeline.end += shift;
        }
      }
    }

    groupOffset += groupDuration;
  }

  if (signal?.aborted) {
    return null;
  }

  const instantEventsByTimestamp = new Map<number, TraceEvent[]>();
  const boundarySet = new Set<number>();

  for (const { start, end, event } of eventTimelineById.values()) {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      continue;
    }

    boundarySet.add(start);
    boundarySet.add(end);

    if (end <= start) {
      const existing = instantEventsByTimestamp.get(start) ?? [];
      existing.push(event);
      instantEventsByTimestamp.set(start, existing);
    }
  }

  if (!boundarySet.size || signal?.aborted) {
    return null;
  }

  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  const globalStart = boundaries[0];
  const globalEnd = boundaries[boundaries.length - 1];

  if (!Number.isFinite(globalStart) || !Number.isFinite(globalEnd)) {
    return null;
  }

  const totalDuration = Math.max(0, globalEnd - globalStart);
  const startTimeMs = Date.now();
  const TEN_SECONDS_MS = 10_000;
  const percentIncrement = totalDuration > 0 ? 0.1 : Number.POSITIVE_INFINITY;
  let nextPercentRatio = percentIncrement;
  let nextTimeDeadlineMs = startTimeMs + TEN_SECONDS_MS;
  let completionLogged = false;
  const EPS = 1e-6;

  const logProgress = (offset: number, force = false) => {
    if (!logger) {
      return;
    }

    if (completionLogged) {
      return;
    }

    const nowMs = Date.now();

    if (totalDuration <= 0) {
      if (force && !completionLogged) {
        const elapsedSeconds = (nowMs - startTimeMs) / 1000;
        logger.info(`Building Speedscope profile: 100.0% (${elapsedSeconds.toFixed(2)}s elapsed)`);
        completionLogged = true;
      }
      return;
    }

    const progressRatio = Math.min(Math.max(offset / totalDuration, 0), 1);
    let shouldLog = force;

    if (
      !shouldLog &&
      nextPercentRatio !== Number.POSITIVE_INFINITY &&
      progressRatio + EPS >= nextPercentRatio
    ) {
      shouldLog = true;
    }

    if (!shouldLog && nowMs >= nextTimeDeadlineMs) {
      shouldLog = true;
    }

    if (!shouldLog) {
      return;
    }

    const ratioForMessage = force || progressRatio >= 1 - EPS ? 1 : progressRatio;
    const elapsedSeconds = (nowMs - startTimeMs) / 1000;

    logger.info(
      `Building Speedscope profile: ${(ratioForMessage * 100).toFixed(
        1
      )}% (${elapsedSeconds.toFixed(2)}s elapsed)`
    );

    if (ratioForMessage >= 1 - EPS) {
      completionLogged = true;
    }

    if (nextPercentRatio !== Number.POSITIVE_INFINITY && progressRatio + EPS >= nextPercentRatio) {
      while (progressRatio + EPS >= nextPercentRatio) {
        nextPercentRatio += percentIncrement;
        if (nextPercentRatio >= 1 - EPS) {
          nextPercentRatio = Number.POSITIVE_INFINITY;
          break;
        }
      }
    }

    nextTimeDeadlineMs = nowMs + TEN_SECONDS_MS;
  };

  const frameIndexByKey = new Map<string, number>();
  const frames: SpeedscopeFrame[] = [];

  const getFrameIndex = (event: TraceEvent): number => {
    const name = buildFrameName(event);

    const categoryParts: string[] = [];
    if (event.type) {
      categoryParts.push(event.type);
    }
    if (event.subtype) {
      categoryParts.push(event.subtype);
    }
    if (!categoryParts.length) {
      categoryParts.push(event.kind);
    }

    const category = categoryParts.join(':');
    const key = `${name}|${category}`;
    const existing = frameIndexByKey.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const frame: SpeedscopeFrame = category.length ? { name, category } : { name };
    const index = frames.length;
    frames.push(frame);
    frameIndexByKey.set(key, index);
    return index;
  };

  const isActiveAt = (timeline: EventTimeline, timestamp: number) =>
    timeline.start <= timestamp && timeline.end > timestamp;

  const getStackAtTime = (timestamp: number): TraceEvent[] => {
    let best:
      | {
          stack: TraceEvent[];
          depth: number;
          start: number;
          id: string;
        }
      | undefined;

    for (const timeline of eventTimelineById.values()) {
      if (timeline.end <= timeline.start) {
        continue;
      }

      if (!isActiveAt(timeline, timestamp)) {
        continue;
      }

      const activeStack: TraceEvent[] = [];
      for (const stackEvent of timeline.stack) {
        const stackTimeline = eventTimelineById.get(stackEvent.id);
        if (!stackTimeline || !isActiveAt(stackTimeline, timestamp)) {
          continue;
        }
        activeStack.push(stackEvent);
      }

      if (!activeStack.length) {
        continue;
      }

      const depth = activeStack.length;
      if (
        !best ||
        depth > best.depth ||
        (depth === best.depth && timeline.start < best.start) ||
        (depth === best.depth && timeline.start === best.start && timeline.event.id < best.id)
      ) {
        best = {
          stack: activeStack,
          depth,
          start: timeline.start,
          id: timeline.event.id,
        };
      }
    }

    return best ? best.stack : [];
  };

  const events: SpeedscopeEvent[] = [];
  let currentStack: TraceEvent[] = [];

  const syncStacks = (targetStack: TraceEvent[], timestamp: number) => {
    let prefix = 0;
    while (
      prefix < currentStack.length &&
      prefix < targetStack.length &&
      currentStack[prefix].id === targetStack[prefix].id
    ) {
      prefix += 1;
    }

    const offset = Math.max(0, timestamp - globalStart);

    for (let index = currentStack.length - 1; index >= prefix; index -= 1) {
      const frame = currentStack[index];
      events.push({
        type: 'C',
        frame: getFrameIndex(frame),
        at: offset,
      });
    }

    for (let index = prefix; index < targetStack.length; index += 1) {
      const frame = targetStack[index];
      events.push({
        type: 'O',
        frame: getFrameIndex(frame),
        at: offset,
      });
    }

    currentStack = targetStack.slice();
  };

  for (const timestamp of boundaries) {
    const targetStack = getStackAtTime(timestamp);
    syncStacks(targetStack, timestamp);
    const offset = Math.max(0, timestamp - globalStart);
    logProgress(offset);

    const instantEvents = instantEventsByTimestamp.get(timestamp);
    if (instantEvents?.length) {
      instantEvents.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      for (const instant of instantEvents) {
        const frame = getFrameIndex(instant);
        events.push({ type: 'O', frame, at: offset });
        events.push({ type: 'C', frame, at: offset });
      }
    }
  }

  if (currentStack.length) {
    syncStacks([], globalEnd);
  }

  logProgress(totalDuration);
  logProgress(totalDuration, true);

  if (!events.length) {
    return null;
  }

  const endValue = totalDuration;

  return {
    $schema: SPEEDSCOPE_SCHEMA_URL,
    shared: {
      frames,
    },
    profiles: [
      {
        type: 'evented',
        name: 'APM trace profile',
        unit: 'microseconds',
        startValue: 0,
        endValue,
        events,
      },
    ],
    activeProfileIndex: 0,
  };
}

function sanitizeFrameName(name: string): string {
  return name.replace(/[;\n\r\t]+/g, ' ').trim() || '(empty)';
}

function buildFrameName(event: TraceEvent): string {
  const baseName = sanitizeFrameName(event.name);
  const serviceName = event.serviceName ? sanitizeFrameName(event.serviceName) : '';

  if (!serviceName) {
    return baseName;
  }

  return `${serviceName}: ${baseName}`;
}
