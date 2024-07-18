/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { keyBy, mapValues, pick } from 'lodash';
import {
  createElasticsearchClient,
  ObservabilityAIAssistantElasticsearchClient,
} from '../../service/elasticsearch';
import { flattenObject } from './flatten_object';

async function analyzeKeywordFields({
  indices,
  keywordFields,
  probability,
  client,
  start,
  end,
  filter,
}: {
  indices: string[];
  keywordFields: string[];
  probability: number;
  client: ObservabilityAIAssistantElasticsearchClient;
  start: string;
  end: string;
  filter: QueryDslQueryContainer[];
}) {
  const fieldAggregations = mapValues(
    keyBy(keywordFields, (fieldName) => fieldName),
    (field) => {
      return {
        filter: {
          match_all: {},
        },
        aggs: {
          cardinality_of_field: {
            cardinality: {
              field,
            },
          },
          top_terms_for_field: {
            terms: {
              field,
              size: 5,
            },
          },
        },
      };
    }
  );

  const response = await client.search('analyze_keyword_field_statistics', {
    track_total_hits: false,
    size: 0,
    index: indices,
    query: {
      bool: {
        filter: [
          ...filter,
          {
            range: {
              '@timestamp': {
                gte: start,
                lte: end,
              },
            },
          },
        ],
      },
    },
    aggs: {
      sampler: {
        random_sampler: {
          probability,
        },
        aggs: fieldAggregations,
      },
    },
  });

  if (!response.aggregations) {
    return {};
  }

  const {
    doc_count: docCount,
    probability: _probability,
    seed,
    ...rest
  } = response.aggregations.sampler;

  return mapValues(rest, (value) => {
    return {
      cardinality: value.cardinality_of_field.value,
      top_terms: value.top_terms_for_field.buckets.map((bucket) => bucket.key as string),
    };
  });
}

async function analyzeTextFields({
  indices,
  textFields,
  probability,
  client,
  start,
  end,
  filter,
}: {
  indices: string[];
  textFields: string[];
  probability: number;
  client: ObservabilityAIAssistantElasticsearchClient;
  start: string;
  end: string;
  filter: QueryDslQueryContainer[];
}) {
  const fieldAggregations = mapValues(
    keyBy(textFields, (fieldName) => fieldName),
    (field) => {
      return {
        categorize_text: {
          size: 5,
          field,
        },
        aggs: {
          samples: {
            top_hits: {
              size: 1,
              _source: [field],
              sort: {
                '@timestamp': 'desc' as const,
              },
            },
          },
        },
      };
    }
  );

  const response = await client.search('analyze_text_field_statistics', {
    track_total_hits: false,
    size: 0,
    index: indices,
    query: {
      bool: {
        filter: [
          ...filter,
          {
            range: {
              '@timestamp': {
                gte: start,
                lte: end,
              },
            },
          },
        ],
      },
    },
    aggs: {
      sampler: {
        random_sampler: {
          probability,
        },
        aggs: fieldAggregations,
      },
    },
  });

  if (!response.aggregations) {
    return {};
  }

  return mapValues(pick(response.aggregations.sampler, Object.keys(fieldAggregations)), (value) => {
    return {
      categories: value.buckets.map((bucket) => {
        return {
          category: bucket.key,
          samples: bucket.samples.hits.hits.map((hit) => {
            return Object.values(flattenObject(hit._source!))[0];
          }),
        };
      }),
    };
  });
}

export interface DatasetFieldAnalysis {
  keyword: Record<string, { cardinality: number; top_terms: string[] }>;
  text: Record<
    string,
    {
      categories: Array<{
        category: string;
        samples: string[];
      }>;
    }
  >;
}

export async function analyzeFields({
  esClient,
  indices,
  keywordFields,
  textFields,
  totalDocCount,
  logger,
  start,
  end,
  filter,
}: {
  esClient: IScopedClusterClient;
  indices: string[];
  keywordFields: string[];
  textFields: string[];
  totalDocCount: number;
  logger: Logger;
  start: string;
  end: string;
  filter: QueryDslQueryContainer[];
}): Promise<DatasetFieldAnalysis> {
  let probability = 1_000_000 / totalDocCount;

  if (probability > 0.5) {
    probability = 1;
  }

  const client = createElasticsearchClient({
    client: esClient.asCurrentUser,
    logger,
  });

  const [keyword, text] = await Promise.all([
    keywordFields.length
      ? analyzeKeywordFields({
          client,
          indices,
          keywordFields,
          probability,
          start,
          end,
          filter,
        })
      : Promise.resolve({}),
    textFields.length
      ? analyzeTextFields({
          client,
          indices,
          textFields,
          probability,
          start,
          end,
          filter,
        })
      : Promise.resolve({}),
  ]);

  return {
    keyword,
    text,
  };
}
