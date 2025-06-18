/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';

export const KnowledgeBasePrompt = createPrompt({
  name: 'knowledge_base_agent',
  description: `Finds and queries content indices in the cluster`,
  input: z.object({}),
})
  .version({
    system: ``,
    template: {
      chat: {
        messages: [],
      },
    },
    tools: {
      get_content_indices: {
        description: `Get a list of indices that may have text content for the given query`,
        schema: {
          type: 'object',
          properties: {
            query: {
              description:
                'A text-based query to execute. Leave empty if you want to list all content indices',
              type: 'string',
            },
          },
        },
      },
      describe_dataset: {
        description: `Get an aggregate analysis of data in an index`,
        schema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
            },
          },
          required: ['index'],
        },
      },
      search_and_rerank: {
        description: 'Executes a search request and get the top results',
        schema: {
          type: 'object',
          properties: {
            query_dsl: {
              description: 'The query DSL query container. See the schema in the prompt',
              type: 'object',
              properties: {},
            },
          },
        },
      },
    },
  })
  .get();
