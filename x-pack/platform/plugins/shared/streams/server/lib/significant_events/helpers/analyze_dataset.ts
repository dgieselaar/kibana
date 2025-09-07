/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { type Streams, getIndexPatternsForStream } from '@kbn/streams-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';

interface Params {
  start: number;
  end: number;
  definition: Streams.all.Definition;
  filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
}

interface Dependencies {
  esClient: TracedElasticsearchClient;
}

export async function analyzeDataset(params: Params, dependencies: Dependencies) {
  const { esClient } = dependencies;
  const { start, end, definition, filter } = params;
  const analysis = await describeDataset({
    esClient: esClient.client,
    start,
    end,
    index: getIndexPatternsForStream(definition),
    filter,
  });

  const short = sortAndTruncateAnalyzedFields(analysis);

  const textFields = analysis.fields
    .filter((field) => field.types.includes('text'))
    .map((field) => field.name);

  const categorizationField = textFields.includes('message')
    ? 'message'
    : textFields.includes('body.text')
    ? 'body.text'
    : undefined;

  return { categorizationField, short };
}
