/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import pLimit from 'p-limit';
import { bytePartition, indexPatternToCss } from '@kbn/std';

const excludeDataStreamsPatterns = indexPatternToCss(['logs*', 'metrics*', 'traces*', '.ds*']);

export async function getNonTimeseriesIndices({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string[];
}) {
  const chunksForResolveIndex = bytePartition(index);

  const limiter = pLimit(5);

  const resolveIndexResults = await Promise.all(
    chunksForResolveIndex.map((chunk) => {
      return limiter(() =>
        esClient.indices.resolveIndex({
          name: chunk.concat(excludeDataStreamsPatterns),
          filter_path: 'indices',
        })
      );
    })
  );

  const allIndices = resolveIndexResults.flatMap((result) => {
    return result.indices.flatMap(({ name, data_stream: dataStream }) =>
      !dataStream ? [name] : []
    );
  });

  return allIndices;
}
