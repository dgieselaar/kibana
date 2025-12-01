/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { executeAsInvestigationAgent } from '@kbn/observability-agents';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';

export async function analyzeStream({
  stream,
  start,
  end,
  esClient,
  inferenceClient,
  logger,
  signal,
}: {
  stream: Streams.all.Definition;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  signal: AbortSignal;
}) {
  const response = await executeAsInvestigationAgent({
    start,
    end,
    index: stream.name,
    esClient,
    inferenceClient,
    logger,
    kql: '',
    signal,
  });

  return response;
}
