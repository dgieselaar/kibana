/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis } from '@kbn/ai-tools';
import { executeAsEsqlAgent, formatDocumentAnalysis, pValueToLabel } from '@kbn/ai-tools';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types';
import { dateRangeQuery } from '@kbn/es-query';
import Mustache from 'mustache';
import { castArray, isNumber } from 'lodash';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import extractKeyMetricQueriesText from './extract_key_metric_queries.text';
import type { Timeseries } from '../../schema/types';

export async function extractKeyMetrics({
  inferenceClient,
  esClient,
  logger,
  analysis,
  signal,
  start,
  end,
  kql,
  index,
  rules,
  anomalyDetectionJobs,
  sloDefinitions,
}: {
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  analysis: DocumentAnalysis;
  signal: AbortSignal;
  start: number;
  end: number;
  kql: string;
  index: string | string[];
  rules: unknown[];
  anomalyDetectionJobs: unknown[];
  sloDefinitions: unknown[];
}): Promise<Array<{ query: string; timeseries: Timeseries }>> {
  const params = [
    {
      _tstart: {
        value: new Date(start).toISOString(),
      },
    },
    {
      _tend: {
        value: new Date(end).toISOString(),
      },
    },
  ] as unknown as FieldValue[];

  const { toolCalls } = await executeAsEsqlAgent({
    inferenceClient,
    esClient,
    logger,
    prompt: Mustache.render(extractKeyMetricQueriesText, {
      kql,
      index: castArray(index).join(','),
      analysis: JSON.stringify(formatDocumentAnalysis(analysis)),
      rules: JSON.stringify(rules),
      anomaly_detection_jobs: JSON.stringify(anomalyDetectionJobs),
      slo_definitions: JSON.stringify(sloDefinitions),
    }),
    signal,
    start,
    end,
    finalToolChoice: {
      function: 'extract_key_metric_queries',
    },
    params,
    tools: {
      extract_key_metric_queries: {
        description: '',
        schema: {
          type: 'object',
          properties: {
            metrics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                  },
                },
                required: ['query'],
              },
            },
          },
          required: ['metrics'],
        },
      } as const,
    },
    toolCallbacks: {
      extract_key_metric_queries: async () => {
        return {
          response: {
            acknowledged: true,
          },
        };
      },
    },
  });

  const keyMetricQueries = toolCalls.flatMap((toolCall) => toolCall.function.arguments.metrics);

  const keyMetrics = await Promise.all(
    keyMetricQueries.map(
      async (metricQuery): Promise<{ query: string; timeseries: Timeseries }> => {
        const response = await esClient.esql.query({
          query: metricQuery.query,
          filter: {
            bool: {
              filter: [...dateRangeQuery(start, end)],
            },
          },
          params,
        });

        const columns = response.columns ?? [];
        const values = response.values ?? [];

        const idxX = columns.findIndex((c) => c.name === 'x');
        const idxY = columns.findIndex((c) => c.name === 'y');
        const idxChangeType = columns.findIndex((c) => c.name === 'change_point.type');
        const idxChangeP = columns.findIndex((c) => c.name === 'change_point.p_value');

        const timeseries: Timeseries = values.map((row) => {
          const xVal = row[idxX];
          const yVal = row[idxY];
          const changeType = row[idxChangeType];
          const changeP = row[idxChangeP];

          const change =
            typeof changeType === 'string'
              ? {
                  type: changeType as ChangePointType,
                  ...(isNumber(changeP)
                    ? {
                        significance: pValueToLabel(changeP),
                        p_value: changeP,
                      }
                    : { significance: null, p_value: null }),
                }
              : null;

          return {
            x: new Date(xVal as string | number).toISOString(),
            y: typeof yVal === 'number' ? yVal : yVal == null ? null : Number(yVal),
            change,
          };
        });

        return {
          query: metricQuery.query,
          timeseries,
        };
      }
    )
  );

  return keyMetrics;
}
