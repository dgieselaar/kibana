/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLogPatterns } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { compact, orderBy, take } from 'lodash';
import { ShortIdTable, type BoundInferenceClient } from '@kbn/inference-common';
import { v4 } from 'uuid';
import type { Timeseries } from '../../schema/types';

export async function extractLogPatterns({
  esClient,
  inferenceClient,
  logger,
  kql,
  signal,
  start,
  end,
  index,
  size = 25,
}: {
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  kql?: string;
  signal: AbortSignal;
  index: string | string[];
  size: number;
}): Promise<
  Array<{
    pattern: string;
    example: string;
    label: 'normal' | 'unusual' | 'warning' | 'error';
    timeseries: Timeseries;
  }>
> {
  const logPatterns = await getLogPatterns({
    start,
    end,
    esClient: createTracedEsClient({
      client: esClient,
      abortSignal: signal,
      logger,
      plugin: 'streams',
    }),
    fields: ['message'],
    index,
    includeChanges: true,
    kql,
  });

  if (logPatterns.length === 0) {
    return [];
  }

  const allLogPatterns = logPatterns.map((pattern) => {
    const change = pattern.change;
    return {
      pattern: pattern.regex,
      example: pattern.sample,
      timeseries: pattern.timeseries.map((coord) => {
        const x = new Date(coord.x).toISOString();

        if (change && change.timestamp && new Date(change.timestamp).toISOString() === x) {
          return {
            x,
            y: coord.y,
            change: {
              p_value: change.p_value ?? null,
              significance: change.significance,
              type: change.type,
            },
          };
        }
        return {
          x,
          y: coord.y,
          change: null,
        };
      }),
      // Include top-level change metadata to support ordering by change significance and p_value
      change: change
        ? {
            p_value: change.p_value ?? null,
            significance: change.significance,
            type: change.type,
          }
        : null,
    };
  });

  const table = new ShortIdTable();

  const logPatternsById = new Map(
    allLogPatterns.map((pattern) => {
      return [v4(), pattern];
    })
  );

  const serializedLogPatterns = Array.from(logPatternsById.entries()).map(([id, pattern]) => {
    return {
      id: table.take(id),
      pattern: pattern.pattern,
      example: pattern.example,
    };
  });

  const labelOutput = await inferenceClient.output({
    id: 'label_log_patterns',
    stream: false,
    system: `You are an Observability expert, specialized in log messages. You will receive
    a list of log patterns that have been extracted for a system, using text categorization.
    Each pattern will have A) its regular expression, B) an example log message, C) a short
    unique identifier. You need to label each log pattern with one of the following categories:

    - \`normal\`: this pattern is indicative of normal operations that occur frequently when
    a system is running, such as access or request logs  
    - \`unusual\`: the pattern indicates unusual operations, that are not necessarily concerning,
    such as startup/shutdown messages
    - \`warning\`: this pattern could be indicative of an unexpected state or unexpected behavior
    of the system, such as login failures or cache misses
    - \`error\`: this pattern is indicative of failures in the system, such as connection issues
    to an upstream service, or internal errors
    `,
    schema: {
      type: 'object',
      properties: {
        patterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              label: {
                type: 'string',
                enum: ['normal', 'unusual', 'warning', 'error'],
              },
            },
            required: ['id', 'label'],
          },
        },
      },
      required: ['patterns'],
    } as const,
    input: `These are the provided log patterns:
    
    ${JSON.stringify(serializedLogPatterns)}`,
  });

  const logPatternsWithLabels = compact(
    labelOutput.output.patterns.map(({ id, label }) => {
      const patternId = table.lookup(id);
      const pattern = patternId ? logPatternsById.get(patternId) : undefined;
      if (!pattern) {
        return undefined;
      }

      return {
        ...pattern,
        label,
      };
    })
  );

  const labelPriority: Record<'error' | 'warning' | 'unusual' | 'normal', number> = {
    error: 3,
    warning: 2,
    unusual: 1,
    normal: 0,
  };

  const orderedPatterns = orderBy(
    logPatternsWithLabels,
    [
      (p) => {
        const change = p.change;
        if (
          (change?.significance === 'medium' || change?.significance === 'high') &&
          typeof change.p_value === 'number'
        ) {
          return change.p_value;
        }
        return -1;
      },
      (p) => labelPriority[p.label],
    ],
    ['desc', 'desc']
  );

  return take(orderedPatterns, size);
}
