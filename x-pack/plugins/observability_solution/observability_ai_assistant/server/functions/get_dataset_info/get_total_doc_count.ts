/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IScopedClusterClient } from '@kbn/core/server';

export async function getTotalDocCount({
  esClient,
  indices,
  start,
  end,
  filter,
}: {
  esClient: IScopedClusterClient;
  indices: string[];
  start: string;
  end: string;
  filter: QueryDslQueryContainer[];
}): Promise<{ total: number }> {
  const from = datemath.parse(start)?.valueOf();
  const to = datemath.parse(end)?.valueOf();

  if (!from || !to) {
    throw new Error(`Failed to parse start / end from ${start} / ${end}`);
  }

  const response = await esClient.asCurrentUser.search({
    index: indices.concat('-.*'),
    expand_wildcards: ['open'],
    query: {
      bool: {
        filter,
      },
    },
    track_total_hits: true,
  });

  return {
    total:
      response.hits.total !== undefined && typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0,
  };
}
