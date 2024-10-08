/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const metricNameSchema = z
  .string()
  .length(1)
  .regex(/[a-zA-Z]/)
  .toUpperCase();

const apiMetricSchema = z.object({
  name: z.string(),
  metrics: z.array(
    z.object({
      name: metricNameSchema,
      path: z.string(),
    })
  ),
  equation: z.string(),
});

const metadataSchema = z
  .object({
    source: z.string(),
    destination: z.string(),
    fromRoot: z.boolean().default(false),
  })
  .or(
    z.string().transform((value) => ({
      source: value,
      destination: value,
      fromRoot: false,
    }))
  )
  .transform((metadata) => ({
    ...metadata,
    destination: metadata.destination ?? metadata.source,
  }))
  .superRefine((value, ctx) => {
    if (value.source.length === 0) {
      ctx.addIssue({
        path: ['source'],
        code: z.ZodIssueCode.custom,
        message: 'source should not be empty',
      });
    }
    if (value.destination.length === 0) {
      ctx.addIssue({
        path: ['destination'],
        code: z.ZodIssueCode.custom,
        message: 'destination should not be empty',
      });
    }
  });

export const apiScraperDefinitionSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  name: z.string(),
  identityFields: z.array(z.string()),
  metadata: z.array(metadataSchema),
  metrics: z.array(apiMetricSchema),
  source: z.object({
    type: z.literal('elasticsearch_api'),
    endpoint: z.string(),
    method: z.enum(['GET', 'POST']),
    params: z.object({
      body: z.record(z.string(), z.any()),
      query: z.record(z.string(), z.any()),
    }),
    collect: z.object({
      path: z.string(),
      keyed: z.boolean().default(false),
    }),
  }),
  managed: z.boolean().default(false),
  apiKeyId: z.optional(z.string()),
});

export type ApiScraperDefinition = z.infer<typeof apiScraperDefinitionSchema>;
