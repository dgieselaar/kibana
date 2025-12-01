/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitions, ToolSchema } from '@kbn/inference-common';
import { ListDatasetsTool } from '../list_datasets/list_datasets_tool';

export const esqlQuerySchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'The ES|QL query to be executed',
    },
    params: {
      type: 'array',
      description: 'Any ES|QL query parameters you want to use',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the parameter',
          },
          value: {
            type: 'string',
            description: 'The value of the parameter',
          },
        },
        required: ['name', 'value'],
      },
    },
  },
  required: ['query'],
} as const satisfies ToolSchema;

export const esqlTools = {
  get_documentation: {
    description: `Get documentation about specific ES|QL commands or functions.
    Only documentation for the requested commands or functions will be returned`,
    schema: {
      type: 'object',
      properties: {
        commands: {
          type: 'array',
          description: 'Any commands you want to request documentation for',
          items: {
            type: 'string',
          },
        },
        functions: {
          type: 'array',
          description: 'Any functions you want to request documentation for',
          items: {
            type: 'string',
          },
        },
      },
      required: [],
    },
  },
  validate_queries: {
    description: 'Validate one or more ES|QL queries for syntax errors and/or mapping issues',
    schema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: esqlQuerySchema,
        },
      },
      required: ['queries'],
    },
  },
  run_queries: {
    description: 'Run one or more validated ES|QL queries and retrieve the results',
    schema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: esqlQuerySchema,
        },
      },
      required: ['queries'],
    },
  },
  list_datasets: ListDatasetsTool,
  describe_dataset: {
    description: `Get dataset description via sampling of documents`,
    schema: {
      type: 'object',
      properties: {
        index: {
          type: 'string',
          description: 'Index, data stream or index pattern you want to analyze',
        },
        kql: {
          type: 'string',
          description: 'KQL for filtering the data',
        },
      },
      required: ['index'],
    },
  },
} as const satisfies ToolDefinitions;
