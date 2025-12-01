/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { InspectSystemPrompt } from './prompt';
import type { InspectSystemPromptInput } from './types';

export async function inspectSystem({
  inferenceClient,
  signal,
  input,
}: {
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  signal: AbortSignal;
  input: InspectSystemPromptInput;
}) {
  const assistantResponse = await executeAsReasoningAgent({
    inferenceClient,
    prompt: InspectSystemPrompt,
    abortSignal: signal,
    finalToolChoice: {
      function: 'diagnose',
      summarize: true,
    },
    maxSteps: 2,
    power: 'high',
    input,
    toolCallbacks: {
      diagnose: async () => {
        return {
          response: {
            acknowledged: true,
          },
        };
      },
    },
  });

  return {
    needs_investigation: assistantResponse.toolCalls[0].function.arguments.needs_investigation,
    content: assistantResponse.content,
  };
}
