/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  BoundInferenceClient,
  PromptResponse,
  ToolCallbacksOfToolOptions,
  ToolDefinition,
  ToolDefinitions,
  ToolNamesOf,
  ToolOptions,
} from '@kbn/inference-common';
import { truncateList } from '@kbn/inference-common';
import type { PromptCompositeResponse, PromptOptions } from '@kbn/inference-common/src/prompt/api';
import { EsqlDocumentBase, runAndValidateEsqlQuery } from '@kbn/inference-plugin/server';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { omit, once } from 'lodash';
import moment from 'moment';
import kbnDatemath from '@kbn/datemath';
import type { FinalToolChoice } from '@kbn/inference-prompt-utils';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { describeDataset, formatDocumentAnalysis } from '../../..';
import { EsqlPrompt } from './prompt';
import { listDatasets } from '../list_datasets/list_datasets';

const loadEsqlDocBase = once(() => EsqlDocumentBase.load());

export function executeAsEsqlAgent<
  TTools extends Record<string, ToolDefinition> | undefined =
    | Record<string, ToolDefinition>
    | undefined,
  TFinalToolChoice extends FinalToolChoice<ToolNamesOf<{ tools: TTools }>> | undefined =
    | FinalToolChoice<ToolNamesOf<{ tools: TTools }>>
    | undefined
>(
  options: {
    inferenceClient: BoundInferenceClient;
    esClient: ElasticsearchClient;
    logger: Logger;
    start?: number;
    end?: number;
    signal: AbortSignal;
    prompt: string;
    tools?: TTools;
    params?: FieldValue[];
  } & (TTools extends Record<string, ToolDefinition>
    ? keyof TTools extends never
      ? {}
      : {
          toolCallbacks: ToolCallbacksOfToolOptions<{ tools: TTools }>;
          finalToolChoice?: TFinalToolChoice;
        }
    : {})
): PromptCompositeResponse<
  PromptOptions<typeof EsqlPrompt> & {
    tools: TTools;
    stream: false;
  } & (TFinalToolChoice extends FinalToolChoice ? { toolChoice: TFinalToolChoice } : {})
>;

export async function executeAsEsqlAgent({
  inferenceClient,
  esClient,
  start,
  end,
  signal,
  prompt,
  tools,
  toolCallbacks,
  finalToolChoice,
  params,
}: {
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  start?: number;
  end?: number;
  signal: AbortSignal;
  prompt: string;
  tools?: ToolDefinitions;
  toolCallbacks?: ToolCallbacksOfToolOptions<ToolOptions>;
  finalToolChoice?: FinalToolChoice;
  params?: FieldValue[];
}): Promise<PromptResponse> {
  const docBase = await loadEsqlDocBase();

  async function runEsqlQuery(query: string) {
    return await runAndValidateEsqlQuery({
      query,
      client: esClient,
      params,
    }).then((response) => {
      if (response.error || response.errorMessages?.length) {
        return {
          error: {
            message: response.error?.message,
            ...(response.error && response.error instanceof errors.ResponseError
              ? omit(response.error, 'meta')
              : response.error),
          },
          errorMessages: response.errorMessages,
        };
      }

      return {
        columns: response.columns,
        rows: response.rows,
      };
    });
  }

  const assistantReply = await executeAsReasoningAgent({
    inferenceClient,
    prompt: {
      ...EsqlPrompt,
      versions: EsqlPrompt.versions.map((version) => {
        return {
          ...version,
          tools: {
            ...version.tools,
            ...tools,
          },
        };
      }),
    },
    abortSignal: signal,
    finalToolChoice: finalToolChoice as FinalToolChoice<any>,
    toolCallbacks: {
      ...toolCallbacks,
      list_datasets: async (toolCall) => {
        return {
          response: await listDatasets({
            esClient,
            arguments: {
              start: toolCall.function.arguments.start
                ? kbnDatemath.parse(toolCall.function.arguments.start)?.valueOf()
                : start,
              end: toolCall.function.arguments.end
                ? kbnDatemath.parse(toolCall.function.arguments.end)?.valueOf()
                : end,
              kql: toolCall.function.arguments.kql,
              pattern: toolCall.function.arguments.pattern,
            },
          }),
        };
      },
      describe_dataset: async (toolCall) => {
        const analysis = await describeDataset({
          esClient,
          index: toolCall.function.arguments.index,
          kql: toolCall.function.arguments.kql,
          start: start ?? moment().subtract(24, 'hours').valueOf(),
          end: end ?? moment().valueOf(),
        });

        return {
          response: {
            analysis: formatDocumentAnalysis(analysis),
          },
        };
      },
      get_documentation: async (toolCall) => {
        return {
          response: docBase.getDocumentation(
            toolCall.function.arguments.commands.concat(toolCall.function.arguments.functions),
            { generateMissingKeywordDoc: true }
          ),
        };
      },
      run_queries: async (toolCall) => {
        const results = await Promise.all(
          toolCall.function.arguments.queries.map(async (query) => {
            const response = await runEsqlQuery(query);

            const cols = response.columns ?? [];
            const docs =
              response.rows?.map((row) => {
                const doc: Record<string, any> = {};
                row.forEach((value, idx) => {
                  const col = cols[idx];
                  if (value !== null) {
                    doc[col.name] = value;
                  }
                });
                return doc;
              }) ?? [];

            return {
              query,
              ...(start !== undefined && end !== undefined
                ? {
                    timeRange: {
                      start: new Date(start).toISOString(),
                      end: new Date(end).toISOString(),
                    },
                  }
                : {}),
              response: {
                docs: truncateList(docs, 50),
              },
            };
          })
        );

        return {
          response: {
            results,
          },
        };
      },
      validate_queries: async (toolCall) => {
        const results = await Promise.all(
          toolCall.function.arguments.queries.map(async (query) => {
            return {
              query,
              validation: await runEsqlQuery(query + ' | LIMIT 0').then((response) => {
                if ('error' in response) {
                  return {
                    valid: false,
                    ...response,
                  };
                }

                const cols = truncateList(response.columns?.map((col) => col.name) ?? [], 10);
                return {
                  valid: true,
                  ...(cols.length ? { columns: cols } : {}),
                };
              }),
            };
          })
        );

        return {
          response: {
            results,
          },
        };
      },
    },
    input: {
      prompt,
      esql_system_prompt: docBase.getSystemMessage(),
    },
  });

  return assistantReply;
}
