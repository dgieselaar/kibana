/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import type { TimeRangeOption } from '../types';

export const TIME_RANGES: TimeRangeOption[] = [
  { id: 'last-15m', label: 'Last 15 minutes', value: 'now-15m' },
  { id: 'last-1h', label: 'Last hour', value: 'now-1h' },
  { id: 'last-12h', label: 'Last 12 hours', value: 'now-12h' },
  { id: 'last-24h', label: 'Last 24 hours', value: 'now-24h' },
  { id: 'last-7d', label: 'Last 7 days', value: 'now-7d' },
];

export const DEFAULT_TIME_RANGE = TIME_RANGES[2]; // Last 12 hours

export function getTimeRangeById(id: string, customRange?: TimeRangeOption): TimeRangeOption {
  if (id === 'custom' && customRange) {
    return customRange;
  }
  return TIME_RANGES.find((tr) => tr.id === id) || DEFAULT_TIME_RANGE;
}

export function computeTimeRangeBounds(timeRange: TimeRangeOption): { start: number; end: number } {
  const now = Date.now();
  
  // Handle custom time range (format: "start,end")
  if (timeRange.isCustom) {
    const parts = timeRange.value.split(',').map((p) => p.trim());
    if (parts.length === 2) {
      const startDate = datemath.parse(parts[0]);
      const endDate = datemath.parse(parts[1], { roundUp: true });
      
      if (startDate && endDate) {
        return {
          start: startDate.valueOf(),
          end: endDate.valueOf(),
        };
      }
    }
    // Fallback to default if custom parsing fails
  }
  
  // Handle standard time ranges
  const endDate = datemath.parse('now', { roundUp: true });
  const startDate = datemath.parse(timeRange.value);

  return {
    start: startDate ? startDate.valueOf() : now - 12 * 60 * 60 * 1000,
    end: endDate ? endDate.valueOf() : now,
  };
}

export function parseCustomTimeRange(input: string): TimeRangeOption | null {
  const parts = input.split(',').map((p) => p.trim());
  if (parts.length !== 2) {
    return null;
  }

  const [startInput, endInput] = parts;
  const start = datemath.parse(startInput);
  const end = datemath.parse(endInput, { roundUp: true });

  if (!start || !end) {
    return null;
  }

  return {
    id: 'custom',
    label: `Custom (${startInput} to ${endInput})`,
    value: `${startInput},${endInput}`,
    isCustom: true,
  };
}
