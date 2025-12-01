/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createPrompt } from '@kbn/inference-common';
import systemPromptTemplate from './system_prompt.text';
import contentPromptTemplate from './content_prompt.text';
import { inspectSystemTools } from './tools';
import { serialize, serializeTimeseries } from '../../schema/serialize';

const logPatternsSchema = z
  .array(
    z.object({
      pattern: z.string(),
      example: z.string(),
      timeseries: serializeTimeseries,
    })
  )
  .pipe(serialize);

const keyMetricsSchema = z
  .array(
    z.object({
      query: z.string(),
      timeseries: serializeTimeseries,
    })
  )
  .pipe(serialize);

export const InspectSystemPrompt = createPrompt({
  name: 'inspect_system_prompt',
  description: 'Inspect the health of a system and identify changes',
  input: z.object({
    kql: z.string(),
    log_patterns: logPatternsSchema,
    key_metrics: keyMetricsSchema,
    alerts: z.array(z.unknown()).pipe(serialize),
    slos: z.array(z.unknown()).pipe(serialize),
    anomalies: z.array(z.unknown()).pipe(serialize),
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
    tools: inspectSystemTools,
  })
  .get();
