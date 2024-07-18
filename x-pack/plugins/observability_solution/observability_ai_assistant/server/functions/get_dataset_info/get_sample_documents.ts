/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IScopedClusterClient } from '@kbn/core/server';
import { flattenObject } from './flatten_object';

export async function getSampleDocuments({
  esClient,
  indices,
  start,
  end,
  filter,
}: {
  esClient: IScopedClusterClient;
  indices: string[];
  start?: string;
  end?: string;
  filter: QueryDslQueryContainer[];
}): Promise<{ samples: Array<Record<string, unknown>> }> {
  const from = start && datemath.parse(start)?.valueOf();
  const to = end && datemath.parse(end)?.valueOf();

  const rangeQuery = from && to ? [{ range: { '@timestamp': { gte: from, lte: to } } }] : [];

  const response = await esClient.asCurrentUser.search({
    index: indices,
    expand_wildcards: 'open',
    size: 500,
    track_total_hits: false,
    query: {
      bool: {
        must: [...filter, ...rangeQuery],
        should: [
          {
            function_score: {
              query: {
                match_all: {},
              },
              functions: [
                {
                  random_score: {},
                },
              ],
            },
          },
        ],
      },
    },
  });

  return {
    samples: response.hits.hits.map((hit) => {
      return flattenObject(hit._source!);
    }),
  };
}
