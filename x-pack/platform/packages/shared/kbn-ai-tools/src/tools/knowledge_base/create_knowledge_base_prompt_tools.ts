/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { BoundInferenceClient, ToolOptionsOfPrompt } from '@kbn/inference-common';
import { MaybePromise } from '@opentelemetry/resources';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { describeDataset } from '../describe_dataset';
import { KnowledgeBasePrompt } from './prompt';
import { getContentIndices } from '../get_content_indices';
import { searchAndRerank } from '../relevance_search/search_and_rerank';

export function createKnowledgeBaseTools({
  esClient,
  inferenceClient,
}: {
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
}) {
  return {
    describe_dataset: ({ index }: { index: string }) =>
      describeDataset({
        start: null,
        end: null,
        index,
        esClient,
      }),
    get_content_indices: ({ query, index }: { query?: string; index: string }) => {
      return getContentIndices({ index, query, esClient });
    },
    search_and_rerank: ({
      query_dsl: query,
      index,
      fields,
    }: {
      query_dsl: QueryDslQueryContainer;
      index?: string;
      fields?: string[];
    }) => {
      return searchAndRerank({
        inferenceClient,
        esClient,
        query,
        fields,
        index,
      });
    },
  } satisfies Record<
    keyof ToolOptionsOfPrompt<typeof KnowledgeBasePrompt>['tools'],
    (...args: any[]) => MaybePromise<any>
  >;
}
