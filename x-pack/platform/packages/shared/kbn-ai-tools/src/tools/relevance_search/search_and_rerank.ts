/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { BoundInferenceClient } from '@kbn/inference-common';

export async function searchAndRerank({
  esClient,
  inferenceClient,
  query,
  fields,
  index,
}: {
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  query: QueryDslQueryContainer;
  fields?: string[];
  index?: string;
}) {
  const hits = await esClient
    .search({
      query,
      size: 100,
      index,
      fields: fields
        ? fields.map((field) => ({ field, include_unmapped: true }))
        : [
            {
              field: '*',
              include_unmapped: true,
            },
          ],
      highlight: {
        fields: {
          '*': {},
        },
      },
    })
    .then((response) => {
      const docs = response.hits.hits.map((hit) => {
        return { _index: hit._index, fields: hit.fields };
      });
      return docs;
    });
}
