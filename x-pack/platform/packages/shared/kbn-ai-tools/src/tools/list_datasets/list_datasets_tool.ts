/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from '@kbn/inference-common';

export const ListDatasetsTool = {
  description: `List datasets available to this cluster, either locally or remote.
    This will return indices, aliases, and data streams. Indices that are part of
    an alias or data stream will not be returned. All parameters are optional.`,
  schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: `An index pattern that will be used to filter the available datasets`,
      },
      kql: {
        type: 'string',
        description: `When this filter is set, a best-effort attempt will be performed to only return datasets that have data matching this filter.`,
      },
      start: {
        type: 'string',
        description: `The start of the time range, in ISO timestamps or Elasticsearch datemath (e.g. now-7d)`,
      },
      end: {
        type: 'string',
        description: `The end of the time range, in ISO timestamps or Elasticsearch datemath (e.g. now-7d)`,
      },
    },
  },
} satisfies ToolDefinition;
