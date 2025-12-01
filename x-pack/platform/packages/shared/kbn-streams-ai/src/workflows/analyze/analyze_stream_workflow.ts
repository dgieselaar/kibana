/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { analyzeStream } from './analyze_stream';
import type { StreamWorkflow } from '../types';
import type {
  AnalyzeStreamWorkflowInput,
  AnalyzeStreamWorkflowApplyResult,
  AnalyzeStreamWorkflowGenerateResult,
} from './types';

export const analyzeStreamWorkflow: StreamWorkflow<
  Streams.all.Model,
  AnalyzeStreamWorkflowInput,
  AnalyzeStreamWorkflowGenerateResult,
  AnalyzeStreamWorkflowApplyResult
> = {
  async generate(context, input) {
    const response = await analyzeStream({
      start: context.start,
      end: context.end,
      esClient: context.esClient,
      inferenceClient: context.inferenceClient,
      logger: context.logger,
      signal: context.signal,
      stream: input.stream.definition,
    });

    return {
      change: {
        response,
      },
    };
  },
  async apply(context, input, change) {
    return {
      status: 'success',
      stream: input.stream,
    };
  },
};
