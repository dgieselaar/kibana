/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { Streams, System } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import pLimit from 'p-limit';
import { lastValueFrom } from 'rxjs';
import { IdentifySystemsPrompt } from './prompt';
import { clusterLogs } from '../cluster_logs/cluster_logs';
import conditionSchemaText from '../shared/condition_schema.text';
import { generateStreamDescription } from '../description/generate_description';

export async function identifySystems({
  stream,
  start,
  end,
  esClient,
  kql,
  inferenceClient,
  logger,
}: {
  stream: Streams.all.Definition;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  kql?: string;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
}): Promise<{ systems: System[] }> {
  const [analysis, initialClustering] = await Promise.all([
    describeDataset({
      start,
      end,
      esClient,
      index: stream.name,
      kql: kql || undefined,
    }),
    clusterLogs({
      start,
      end,
      esClient,
      index: stream.name,
      partitions: [],
      logger,
    }),
  ]);

  const response = await executeAsReasoningAgent({
    input: {
      stream: {
        name: stream.name,
      },
      dataset_analysis: JSON.stringify(
        sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true })
      ),
      initial_clustering: JSON.stringify(initialClustering),
      condition_schema: conditionSchemaText,
    },
    prompt: IdentifySystemsPrompt,
    inferenceClient,
    finalToolChoice: {
      function: 'finalize_systems',
    },
    toolCallbacks: {
      validate_systems: async (toolCall) => {
        const clustering = await clusterLogs({
          start,
          end,
          esClient,
          index: stream.name,
          logger,
          partitions: toolCall.function.arguments.systems.map((system) => {
            return {
              name: system.name,
              condition: system.filter as Condition,
            };
          }),
        });

        return {
          response: {
            systems: clustering.map((cluster) => {
              return {
                name: cluster.name,
                clustering: cluster.clustering,
              };
            }),
          },
        };
      },
      finalize_systems: async (toolCall) => {
        return {
          response: {},
        };
      },
    },
  });

  const limiter = pLimit(8);

  return {
    systems: await Promise.all(
      response.toolCalls.flatMap((toolCall) =>
        toolCall.function.arguments.systems.map(async (args) => {
          const system = {
            ...args,
            filter: args.filter as Condition,
            description: '',
          };

          const description = await limiter(async () => {
            return await lastValueFrom(
              generateStreamDescription({
                stream,
                start,
                end,
                esClient,
                inferenceClient,
                system,
              })
            );
          });

          return {
            ...system,
            description,
          };
        })
      )
    ),
  };
}
