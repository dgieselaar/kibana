/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitions } from '@kbn/inference-common';

export const inspectSystemTools = {
  diagnose: {
    description: `Diagnose whether further investigation is needed or not`,
    schema: {
      type: 'object',
      properties: {
        needs_investigation: {
          type: 'boolean',
        },
      },
      required: ['needs_investigation'],
    },
  },
} as const satisfies ToolDefinitions;
