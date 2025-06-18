/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import dedent from 'dedent';
import systemPrompt from './prompts/chat_system_prompt.text';

const agentDescriptionSchema = z
  .record(z.object({ description: z.string() }))
  .transform((input) => {
    const agentFragments = Object.entries(input).map(([agent, { description }]) => {
      return dedent(`### ${agent}
            
            ${description}`);
    });

    return agentFragments.join('\n\n');
  });

export const ObservabilityAIAssistantChatPrompt = createPrompt({
  name: 'observability_ai_assistant_chat',
  description: `Prompt for the chat agent in the Observability AI Assistant`,
  input: z.object({
    agent_description: agentDescriptionSchema,
  }),
})
  .version({
    system: {
      mustache: {
        template: systemPrompt,
      },
    },
    template: {
      chat: {
        messages: [],
      },
    },
  })
  .get();
