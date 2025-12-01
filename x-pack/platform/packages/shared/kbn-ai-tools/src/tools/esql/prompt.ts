/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './system_prompt_template.text';
import contentPromptTemplate from './content_prompt_template.text';
import { esqlTools } from './tools';

export const EsqlPrompt = createPrompt({
  name: 'esql_prompt',
  description: 'Answer ES|QL related questions',
  input: z.object({
    prompt: z.string(),
    esql_system_prompt: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: systemPromptTemplate,
      },
    },
    template: {
      mustache: {
        template: contentPromptTemplate,
      },
    },
    temperature: 0.5,
    tools: esqlTools,
  })
  .get();
