/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

export type TermsQueryInput = Record<string, Array<string | number | boolean>>;

export interface CreateProfileFromTracesOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  kql?: string;
  eventsKql?: string;
  maxDocs?: number;
  signal?: AbortSignal;
}

export interface TraceEvent {
  id: string;
  parentId?: string;
  traceId: string;
  timestampUs: number;
  name: string;
  durationUs: number;
  kind: 'span' | 'transaction';
  type?: string;
  subtype?: string;
  serviceName?: string;
}

export interface TraceAccumulator {
  add: (event: TraceEvent) => boolean;
  getEvents: () => Map<string, TraceEvent>;
  getChildrenMap: () => Map<string, Set<string>>;
  readonly isFull: boolean;
  count: number;
}

export interface SpeedscopeFrame {
  name: string;
  category?: string;
}

export interface SpeedscopeEvent {
  type: 'O' | 'C';
  frame: number;
  at: number;
}

export interface SpeedscopeProfile {
  type: 'evented';
  name: string;
  unit: 'microseconds';
  startValue: number;
  endValue: number;
  events: SpeedscopeEvent[];
}

export interface SpeedscopeFile {
  $schema: string;
  shared: {
    frames: SpeedscopeFrame[];
  };
  profiles: SpeedscopeProfile[];
  activeProfileIndex: number;
}
