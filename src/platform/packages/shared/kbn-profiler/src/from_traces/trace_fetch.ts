/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import {
  MAX_DOCS_PER_REQUEST,
  MAX_PARALLEL_REQUESTS,
  MAX_TRACE_IDS,
  PARENT_TERMS_CHUNK_SIZE,
  REQUESTED_FIELDS,
  SLICE_KEEP_ALIVE,
  TRACE_DATA_STREAM_PATTERNS,
} from './constants';
import type { TraceAccumulator, TraceEvent, TermsQueryInput } from './types';

const SORT_BY_DOC: estypes.Sort = [{ _doc: { order: 'asc' } }];
const SORT_BY_SHARD_DOC: estypes.Sort = [{ _shard_doc: { order: 'asc' } }];

export async function discoverTraceIndices(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<string[]> {
  try {
    const response = await esClient.indices.resolveIndex(
      {
        name: TRACE_DATA_STREAM_PATTERNS.join(','),
      },
      {
        ignore: [404],
      }
    );

    return (response.data_streams ?? []).map((stream) => stream.name);
  } catch (error) {
    throw new Error(`Failed to discover trace data streams`, { cause: error });
  }
}

export function buildBaseFilters({
  kql,
  start,
  end,
}: {
  kql?: string;
  start: number;
  end: number;
}): QueryDslQueryContainer[] {
  const filters: QueryDslQueryContainer[] = [
    {
      range: {
        '@timestamp': {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
    termsQuery({ 'processor.event': ['transaction', 'span'] }),
  ];

  if (kql) {
    try {
      const kueryNode = fromKueryExpression(kql);
      filters.push(toElasticsearchQuery(kueryNode));
    } catch (error) {
      throw new Error(`Failed to parse KQL expression`, { cause: error });
    }
  }

  return filters;
}

export async function fetchTraceIds({
  esClient,
  indices,
  filters,
  logger,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  filters: QueryDslQueryContainer[];
  logger: Logger;
}): Promise<string[]> {
  const response = await esClient.search({
    index: indices,
    size: 0,
    query: {
      bool: {
        filter: filters,
      },
    },
    aggregations: {
      trace_ids: {
        terms: {
          field: 'trace.id',
          size: MAX_TRACE_IDS,
        },
      },
    },
  });

  const buckets = (
    response.aggregations?.trace_ids as { buckets?: Array<{ key: string | number }> }
  )?.buckets;

  if (!buckets || !Array.isArray(buckets)) {
    logger.warn('Trace id aggregation did not return buckets');
    return [];
  }

  return buckets
    .map((bucket) => (typeof bucket.key === 'string' ? bucket.key : String(bucket.key)))
    .filter((key) => Boolean(key));
}

export async function fetchTotalDocs({
  esClient,
  indices,
  filters,
  traceIds,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  filters: QueryDslQueryContainer[];
  traceIds: string[];
}): Promise<number> {
  const response = await esClient.search({
    index: indices,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [...filters, { terms: { 'trace.id': traceIds } }],
      },
    },
  });

  const total = response.hits.total;

  if (typeof total === 'number') {
    return total;
  }

  return total?.value ?? 0;
}

export async function fetchDocumentsWithSlices({
  esClient,
  indices,
  filters,
  traceIds,
  accumulator,
  logger,
  expectedDocs,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  filters: QueryDslQueryContainer[];
  traceIds: string[];
  accumulator: TraceAccumulator;
  logger: Logger;
  expectedDocs: number;
}) {
  let totalSlices = Math.max(1, Math.ceil(expectedDocs / MAX_DOCS_PER_REQUEST));
  let concurrency = Math.min(MAX_PARALLEL_REQUESTS, totalSlices);
  let pitId: string | undefined;

  if (totalSlices > 1) {
    try {
      const pitResponse = await esClient.openPointInTime({
        index: indices,
        keep_alive: SLICE_KEEP_ALIVE,
      });
      pitId = pitResponse.id;
      if (!pitId) {
        logger.warn('Failed to obtain point-in-time id; falling back to unsliced retrieval');
      }
    } catch (error) {
      logger.warn(`Unable to open point-in-time for sliced search (${error}); falling back`);
    }
  }

  if (!pitId) {
    totalSlices = 1;
    concurrency = 1;
  }

  const sliceIds = Array.from({ length: totalSlices }, (_, index) => index);

  try {
    await runWithLimitedConcurrency(
      sliceIds,
      concurrency,
      (sliceId) =>
        processSlice({
          esClient,
          indices,
          filters,
          traceIds,
          sliceId,
          totalSlices,
          accumulator,
          stopAtCount: expectedDocs,
          pitId,
        }),
      () => accumulator.isFull || accumulator.count >= expectedDocs
    );
  } finally {
    if (pitId) {
      try {
        await esClient.closePointInTime({ id: pitId });
      } catch (error) {
        logger.warn(`Failed to close point-in-time: ${error}`);
      }
    }
  }

  logger.info(`Completed sliced retrieval with ${accumulator.count} documents`);
}

async function processSlice({
  esClient,
  indices,
  filters,
  traceIds,
  sliceId,
  totalSlices,
  accumulator,
  stopAtCount,
  pitId,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  filters: QueryDslQueryContainer[];
  traceIds: string[];
  sliceId: number;
  totalSlices: number;
  accumulator: TraceAccumulator;
  stopAtCount: number;
  pitId?: string;
}) {
  let searchAfter: estypes.SortResults | undefined;

  while (true) {
    if (accumulator.isFull || accumulator.count >= stopAtCount) {
      return;
    }

    const boolFilter: QueryDslQueryContainer[] = [...filters, { terms: { 'trace.id': traceIds } }];

    const sort = pitId ? SORT_BY_SHARD_DOC : SORT_BY_DOC;

    let response: estypes.SearchResponse<Record<string, unknown>>;

    if (pitId) {
      response = await esClient.search<Record<string, unknown>>({
        size: MAX_DOCS_PER_REQUEST,
        sort,
        query: {
          bool: {
            filter: boolFilter,
          },
        },
        _source: REQUESTED_FIELDS,
        slice:
          totalSlices > 1
            ? ({ id: sliceId, max: totalSlices } as unknown as estypes.SlicedScroll)
            : undefined,
        search_after: searchAfter,
        pit: {
          id: pitId,
          keep_alive: SLICE_KEEP_ALIVE,
        },
      });
    } else {
      response = await esClient.search<Record<string, unknown>>({
        index: indices,
        size: MAX_DOCS_PER_REQUEST,
        sort,
        query: {
          bool: {
            filter: boolFilter,
          },
        },
        _source: REQUESTED_FIELDS,
        search_after: searchAfter,
      });
    }

    const hits = response.hits.hits;

    if (!hits.length) {
      break;
    }

    for (const hit of hits) {
      const event = mapHitToTraceEvent(hit);
      if (!event) {
        continue;
      }

      const shouldContinue = accumulator.add(event);
      if (!shouldContinue) {
        return;
      }
    }

    const lastSort = hits[hits.length - 1].sort;
    if (!lastSort) {
      break;
    }

    searchAfter = lastSort;
  }
}

export async function fetchDocumentsBreadthFirst({
  esClient,
  indices,
  filters,
  traceIds,
  accumulator,
  logger,
  maxDocs,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  filters: QueryDslQueryContainer[];
  traceIds: string[];
  accumulator: TraceAccumulator;
  logger: Logger;
  maxDocs: number;
}) {
  const rootIds = await fetchRootDocuments({
    esClient,
    indices,
    filters,
    traceIds,
    accumulator,
    maxDocs,
  });

  let currentLevel = rootIds;

  while (currentLevel.length && accumulator.count < maxDocs && !accumulator.isFull) {
    const parentChunks = chunkArray(currentLevel, PARENT_TERMS_CHUNK_SIZE);
    const nextLevel: string[] = [];

    for (const chunk of parentChunks) {
      if (accumulator.count >= maxDocs || accumulator.isFull) {
        break;
      }

      const childIds = await fetchChildrenByParent({
        esClient,
        indices,
        filters,
        traceIds,
        parentIds: chunk,
        accumulator,
        maxDocs,
      });

      nextLevel.push(...childIds);
      if (accumulator.isFull) {
        break;
      }
    }

    currentLevel = nextLevel;
  }

  logger.info(`Breadth-first retrieval collected ${accumulator.count} documents`);
}

async function fetchRootDocuments({
  esClient,
  indices,
  filters,
  traceIds,
  accumulator,
  maxDocs,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  filters: QueryDslQueryContainer[];
  traceIds: string[];
  accumulator: TraceAccumulator;
  maxDocs: number;
}): Promise<string[]> {
  let searchAfter: estypes.SortResults | undefined;
  const rootIds: string[] = [];

  while (accumulator.count < maxDocs) {
    const remaining = maxDocs - accumulator.count;
    const size = Math.min(MAX_DOCS_PER_REQUEST, remaining);
    const response = await esClient.search<Record<string, unknown>>({
      index: indices,
      size,
      sort: SORT_BY_DOC,
      query: {
        bool: {
          filter: [
            ...filters,
            { terms: { 'trace.id': traceIds } },
            {
              bool: {
                must_not: {
                  exists: { field: 'parent.id' },
                },
              },
            },
          ],
        },
      },
      _source: REQUESTED_FIELDS,
      search_after: searchAfter,
    });

    const hits = response.hits.hits;

    if (!hits.length) {
      break;
    }

    for (const hit of hits) {
      const event = mapHitToTraceEvent(hit);
      if (!event) {
        continue;
      }

      rootIds.push(event.id);
      const shouldContinue = accumulator.add(event);
      if (!shouldContinue) {
        return rootIds;
      }
    }

    const lastSort = hits[hits.length - 1].sort;
    if (!lastSort) {
      break;
    }

    searchAfter = lastSort;
  }

  return rootIds;
}

async function fetchChildrenByParent({
  esClient,
  indices,
  filters,
  traceIds,
  parentIds,
  accumulator,
  maxDocs,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  filters: QueryDslQueryContainer[];
  traceIds: string[];
  parentIds: string[];
  accumulator: TraceAccumulator;
  maxDocs: number;
}): Promise<string[]> {
  let searchAfter: estypes.SortResults | undefined;
  const nextLevel: string[] = [];

  while (accumulator.count < maxDocs && !accumulator.isFull) {
    const remaining = maxDocs - accumulator.count;
    const size = Math.min(MAX_DOCS_PER_REQUEST, remaining);

    if (size <= 0) {
      break;
    }

    const response = await esClient.search<Record<string, unknown>>({
      index: indices,
      size,
      sort: SORT_BY_DOC,
      query: {
        bool: {
          filter: [
            ...filters,
            { terms: { 'trace.id': traceIds } },
            { terms: { 'parent.id': parentIds } },
          ],
        },
      },
      _source: REQUESTED_FIELDS,
      search_after: searchAfter,
    });

    const hits = response.hits.hits;

    if (!hits.length) {
      break;
    }

    for (const hit of hits) {
      const event = mapHitToTraceEvent(hit);
      if (!event) {
        continue;
      }

      nextLevel.push(event.id);
      const shouldContinue = accumulator.add(event);

      if (!shouldContinue || accumulator.count >= maxDocs) {
        return nextLevel;
      }
    }

    const lastSort = hits[hits.length - 1].sort;
    if (!lastSort) {
      break;
    }

    searchAfter = lastSort;
  }

  return nextLevel;
}

function mapHitToTraceEvent(hit: estypes.SearchHit<Record<string, unknown>>): TraceEvent | null {
  const source = hit._source ?? {};

  const processorEvent = getField<string>(source, 'processor.event');
  const spanId = getField<string>(source, 'span.id');
  const transactionId = getField<string>(source, 'transaction.id');

  const isTransaction =
    processorEvent === 'transaction' || (!processorEvent && !spanId && Boolean(transactionId));
  const isSpan = processorEvent === 'span' || (!isTransaction && Boolean(spanId));

  const id = isSpan ? spanId : transactionId;
  if (!id) {
    return null;
  }

  const traceId = getField<string>(source, 'trace.id');
  if (!traceId) {
    return null;
  }

  const parentId = getField<string>(source, 'parent.id') || undefined;
  const name = isSpan
    ? getField<string>(source, 'span.name')
    : getField<string>(source, 'transaction.name');
  const type = isSpan
    ? getField<string>(source, 'span.type')
    : getField<string>(source, 'transaction.type');
  const subtype = isSpan ? getField<string>(source, 'span.subtype') || undefined : undefined;
  const durationRaw = isSpan
    ? getField<unknown>(source, 'span.duration.us')
    : getField<unknown>(source, 'transaction.duration.us');
  const timestampRaw = getField<unknown>(source, '@timestamp');
  const serviceName = getField<string>(source, 'service.name') || undefined;

  const durationUs = toNumber(durationRaw);
  const timestampUs = toTimestampMicroseconds(timestampRaw);

  if (durationUs === undefined || timestampUs === undefined) {
    return null;
  }

  return {
    id,
    traceId,
    parentId,
    timestampUs,
    name: name ?? (isSpan ? 'Unnamed span' : 'Unnamed transaction'),
    durationUs,
    kind: isSpan ? 'span' : 'transaction',
    type: type ?? undefined,
    subtype,
    serviceName,
  };
}

function getField<T>(source: Record<string, unknown>, pathKey: string): T | undefined {
  const parts = pathKey.split('.');
  let current: unknown = source;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current as T;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toTimestampMicroseconds(value: unknown): number | undefined {
  if (value instanceof Date) {
    return Math.round(value.getTime() * 1_000);
  }

  if (typeof value === 'number') {
    return value > 100_000_000_000_000 ? Math.round(value) : Math.round(value * 1_000);
  }

  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 100_000_000_000_000 ? Math.round(numeric) : Math.round(numeric * 1_000);
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed * 1_000);
    }
  }

  return undefined;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function termsQuery(fields: TermsQueryInput): QueryDslQueryContainer {
  const entries = Object.entries(fields);
  if (!entries.length) {
    throw new Error('termsQuery requires at least one field');
  }

  if (entries.length === 1) {
    const [field, values] = entries[0];
    return {
      terms: {
        [field]: values,
      },
    };
  }

  return {
    bool: {
      filter: entries.map(([field, values]) => ({
        terms: {
          [field]: values,
        },
      })),
    },
  };
}

async function runWithLimitedConcurrency<T>(
  items: T[],
  limit: number,
  iterator: (item: T) => Promise<void>,
  shouldStop: () => boolean
): Promise<void> {
  if (!items.length) {
    return;
  }

  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      if (shouldStop()) {
        break;
      }

      const currentIndex = index;
      index += 1;

      await iterator(items[currentIndex]);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
}

export const traceFetchTestUtils = {
  mapHitToTraceEvent,
};
