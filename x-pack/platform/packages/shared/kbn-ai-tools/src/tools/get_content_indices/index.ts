/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { indexPatternToCss } from '@kbn/std';
import { uniq } from 'lodash';
import { getNonTimeseriesIndices } from './get_non_timeseries_indices';
import { getTextFields } from './get_text_fields';
import { maskIndexName } from './mask_index_name';

export async function getContentIndices({
  esClient,
  index,
  query,
}: {
  esClient: ElasticsearchClient;
  index?: string;
  query?: string;
}): Promise<Map<string, Map<string, Array<'text' | 'semantic_text'>>>> {
  const indices = await getNonTimeseriesIndices({
    esClient,
    index: indexPatternToCss(index ?? '*'),
  });

  const textFieldsByIndex = await getTextFields({
    esClient,
    indices,
  });

  if (query) {
    const semanticTextFieldsOnly = Array.from(textFieldsByIndex.entries()).flatMap(
      ([maskedIndexName, fieldsMap]) => {
        return Array.from(fieldsMap.entries()).flatMap(([fieldName, types]) => {
          return types
            .filter((type) => type === 'semantic_text')
            .map(() => ({ maskedIndexName, fieldName }));
        });
      }
    );

    if (semanticTextFieldsOnly.length) {
      const response = await esClient.search({
        size: 100,
        query: {
          bool: {
            should: semanticTextFieldsOnly.map(({ maskedIndexName, fieldName }) => {
              return {
                bool: {
                  filter: [{ term: { _index: maskedIndexName } }],
                  should: [
                    {
                      match: {
                        [fieldName]: query,
                      },
                    },
                  ],
                },
              };
            }),
          },
        },
        sort: {
          _score: {
            order: 'desc',
          },
        },
        collapse: {
          field: '_index',
        },
      });

      const top100Indices = response.hits.hits.map((hit) => {
        return hit._index;
      });

      const top5UniqueIndices = uniq(top100Indices.map(maskIndexName)).slice(0, 5);

      const textFieldsByMostRelevantIndices = new Map(
        Array.from(textFieldsByIndex.entries()).filter(([indexName]) =>
          top5UniqueIndices.includes(indexName)
        )
      );

      return textFieldsByMostRelevantIndices;
    }
  }

  return textFieldsByIndex;
}
