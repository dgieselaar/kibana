/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexPatternToCcs, kqlQuery } from '@kbn/es-query';
import { castArray } from 'lodash';
import { truncateList } from '@kbn/inference-common';
import type { AggregationsStringTermsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { ListDatasetResults, ListDatasetsOptions } from './types';
import { rangeQuery } from '../describe_dataset/queries';

/**
 * List datasets available to this cluster.
 */
export async function listDatasets({
  esClient,
  arguments: { pattern, start, end, kql },
}: ListDatasetsOptions): Promise<ListDatasetResults> {
  let indicesWithData: string[] | undefined;

  const timeRangeFilter = rangeQuery(start, end);

  if (kql || (start !== undefined && end !== undefined)) {
    const searchResponse = await esClient.search({
      index: indexPatternToCcs(pattern || '*'),
      query: {
        bool: {
          filter: [
            ...kqlQuery(kql),
            {
              bool: {
                should: [
                  { bool: { filter: timeRangeFilter } },
                  { bool: { must_not: [{ exists: { field: '@timestamp' } }] } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      timeout: '100ms',
      terminate_after: 1,
      aggs: {
        by_index: {
          terms: {
            field: '_index',
            size: 16_000,
          },
        },
      },
    });

    const indexBuckets =
      (
        (await searchResponse.aggregations) as {
          by_index: AggregationsStringTermsAggregate;
        }
      )?.by_index.buckets ?? [];

    indicesWithData = Array.isArray(indexBuckets)
      ? indexBuckets.map((bucket) => bucket.key as string)
      : Object.entries(indexBuckets).map(([key]) => key);
  }

  const response = await esClient.indices.resolveIndex({
    name: indexPatternToCcs(pattern || '*'),
    allow_no_indices: true,
  });

  const allIndices = new Map(response.indices.map((index) => [index.name, index]));

  const allAliases = new Map(
    response.aliases.map((alias) => {
      if (indicesWithData) {
        return [
          alias.name,
          {
            ...alias,
            indices: castArray(alias.indices).filter((index) => indicesWithData.includes(index)),
          },
        ];
      }
      return [alias.name, alias];
    })
  );

  const allDataStreams = new Map(
    response.data_streams.map((dataStream) => {
      if (indicesWithData) {
        return [
          dataStream.name,
          {
            ...dataStream,
            backing_indices: castArray(dataStream.backing_indices).filter((index) =>
              indicesWithData.includes(index)
            ),
          },
        ];
      }
      return [dataStream.name, dataStream];
    })
  );

  if (indicesWithData) {
    allIndices.forEach(({ name }) => {
      if (!indicesWithData.includes(name)) {
        allIndices.delete(name);
      }
    });

    allAliases.forEach(({ name, indices }) => {
      if (indices.length === 0) {
        allAliases.delete(name);
        return;
      }
      castArray(indices).forEach((index) => {
        allIndices.delete(index);
      });
    });

    allDataStreams.forEach(({ name, backing_indices: backingIndices }) => {
      if (backingIndices.length === 0) {
        allDataStreams.delete(name);
        return;
      }
      castArray(backingIndices).forEach((index) => {
        allIndices.delete(index);
      });
    });
  }

  const formatted = {
    indices: truncateList(
      Array.from(allIndices.values()).map((index) => {
        return {
          name: index.name,
        };
      }),
      10
    ),
    aliases: truncateList(
      Array.from(allAliases.values()).map((alias) => {
        return {
          name: alias.name,
          indices: truncateList(castArray(alias.indices), 10),
        };
      }),
      10
    ),
    data_streams: truncateList(
      Array.from(allDataStreams.values()).map((dataStream) => {
        return {
          name: dataStream.name,
          timestamp_field: dataStream.timestamp_field,
        };
      }),
      10
    ),
  };

  return formatted;
}
