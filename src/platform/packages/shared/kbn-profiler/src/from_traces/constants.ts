/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const TRACE_DATA_STREAM_PATTERNS = ['traces-apm*', '*:traces-apm*'] as const;
export const MAX_TRACE_IDS = 10_000;
export const DEFAULT_MAX_DOCS = 2_500_000;
export const MAX_DOCS_PER_REQUEST = 10_000;
export const MAX_PARALLEL_REQUESTS = 5;
export const PARENT_TERMS_CHUNK_SIZE = 1_000;
export const LOG_INTERVAL_MS = 5_000;
export const SLICE_KEEP_ALIVE = '1m';

export const SPEEDSCOPE_SCHEMA_URL = 'https://www.speedscope.app/file-format-schema.json';

export const REQUESTED_FIELDS: string[] = [
  '@timestamp',
  'transaction.duration.us',
  'span.duration.us',
  'transaction.name',
  'span.name',
  'transaction.type',
  'span.type',
  'span.subtype',
  'trace.id',
  'parent.id',
  'processor.event',
  'service.name',
  'transaction.id',
  'span.id',
];
