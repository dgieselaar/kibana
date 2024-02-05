/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { keyBy, mapValues, once, pick } from 'lodash';
import pLimit from 'p-limit';
import Path from 'path';
import { lastValueFrom, type Observable } from 'rxjs';
import { promisify } from 'util';
import type { FunctionRegistrationParameters } from '..';
import type { ChatCompletionChunkEvent } from '../../../common/conversation_complete';
import { FunctionVisibility, MessageRole } from '../../../common/types';
import { concatenateChatCompletionChunks } from '../../../common/utils/concatenate_chat_completion_chunks';
import { emitWithConcatenatedMessage } from '../../../common/utils/emit_with_concatenated_message';
import { correctCommonEsqlMistakes } from './correct_common_esql_mistakes';

const readFile = promisify(Fs.readFile);
const readdir = promisify(Fs.readdir);

const loadSystemMessage = once(async () => {
  const data = await readFile(Path.join(__dirname, './system_message.txt'));
  return data.toString('utf-8');
});

const loadEsqlDocs = once(async () => {
  const dir = Path.join(__dirname, './esql_docs');
  const files = (await readdir(dir)).filter((file) => Path.extname(file) === '.txt');

  if (!files.length) {
    return {};
  }

  const limiter = pLimit(10);
  return keyBy(
    await Promise.all(
      files.map((file) =>
        limiter(async () => {
          const data = (await readFile(Path.join(dir, file))).toString('utf-8');
          const filename = Path.basename(file, '.txt');

          const keyword = filename
            .replace('esql-', '')
            .replace('agg-', '')
            .replaceAll('-', '_')
            .toUpperCase();

          return {
            keyword: keyword === 'STATS_BY' ? 'STATS' : keyword,
            data,
          };
        })
      )
    ),
    'keyword'
  );
});

export function registerEsqlFunction({
  client,
  registerFunction,
  resources,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'execute_query',
      contexts: ['core'],
      visibility: FunctionVisibility.User,
      description: 'Execute an ES|QL query.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: {
            type: 'string',
          },
        },
        required: ['query'],
      } as const,
    },
    async ({ arguments: { query } }) => {
      const response = await (
        await resources.context.core
      ).elasticsearch.client.asCurrentUser.transport.request({
        method: 'POST',
        path: '_query',
        body: {
          query,
        },
      });

      return { content: response };
    }
  );

  registerFunction(
    {
      name: 'esql',
      contexts: ['core'],
      description: `This function answers ES|QL related questions including query generation and syntax/command questions.`,
      visibility: FunctionVisibility.System,
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          switch: {
            type: 'boolean',
          },
        },
        required: ['switch'],
      } as const,
    },
    async ({ messages, connectorId }, signal) => {
      const [systemMessage, esqlDocs] = await Promise.all([loadSystemMessage(), loadEsqlDocs()]);

      const withEsqlSystemMessage = (message?: string) => [
        {
          '@timestamp': new Date().toISOString(),
          message: { role: MessageRole.System, content: `${systemMessage}\n${message ?? ''}` },
        },
        ...messages.slice(1),
      ];

      const source$ = (
        await client.chat('classify_esql', {
          connectorId,
          messages: withEsqlSystemMessage().concat({
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: `Use the classify_esql function to classify the user's request
              in the user message before this.
              and get more information about specific functions and commands
              you think are candidates for answering the question.
              
                
              Examples for functions and commands:
              Do you need to group data? Request \`STATS\`.
              Extract data? Request \`DISSECT\` AND \`GROK\`.
              Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.
  
              Examples for determining whether the user wants to execute a query:
              - "Show me the avg of x"
              - "Give me the results of y"
              - "Display the sum of z"
  
              Examples for determining whether the user does not want to execute a query:
              - "I want a query that ..."
              - "... Just show me the query"
              - "Create a query that ..."`,
            },
          }),
          signal,
          functions: [
            {
              name: 'classify_esql',
              description: `Use this function to determine:
              - what ES|QL functions and commands are candidates for answering the user's question
              - whether the user has requested a query, and if so, it they want it to be executed, or just shown.

              All parameters are required. Make sure the functions and commands you request are available in the
              system message.
              `,
              parameters: {
                type: 'object',
                properties: {
                  commands: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'A list of processing or source commands',
                  },
                  functions: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'A list of functions.',
                  },
                  execute: {
                    type: 'boolean',
                    description:
                      'Whether the user wants to execute a query (true) or just wants the query to be displayed (false)',
                  },
                },
                required: ['commands', 'functions', 'execute'],
              },
            },
          ],
          functionCall: 'classify_esql',
        })
      ).pipe(concatenateChatCompletionChunks());

      const response = await lastValueFrom(source$);

      if (!response.message.function_call.arguments) {
        throw new Error('LLM did not call classify_esql function');
      }

      const args = JSON.parse(response.message.function_call.arguments) as {
        commands: string[];
        functions: string[];
        execute: boolean;
      };

      const keywords = args.commands.concat(args.functions).concat('SYNTAX').concat('OVERVIEW');

      const messagesToInclude = mapValues(pick(esqlDocs, keywords), ({ data }) => data);

      const esqlResponse$: Observable<ChatCompletionChunkEvent> = await client.chat(
        'answer_esql_question',
        {
          messages: [
            ...withEsqlSystemMessage(
              `Format every ES|QL query as Markdown:
              \`\`\`esql
              <query>
              \`\`\`

              Prefer to use commands and functions for which you have requested documentation.

              DO NOT UNDER ANY CIRCUMSTANCES use commands or functions that are not a capability of ES|QL
              as mentioned in the system message and documentation.
              
              Directive: ONLY use aggregation functions in STATS commands, and use ONLY aggregation
              functions in stats commands, NOT in SORT or EVAL.
              Rationale: Only aggregation functions are supported in STATS commands, and aggregation
              functions are only supported in STATS commands. 
              Action: Create new columns using EVAL first and then aggregate over them in STATS commands.
              Do not use aggregation functions anywhere else, such as SORT or EVAL.
              Example:
              \`\`\`esql
              EVAL is_failure_as_number = CASE(event.outcome == "failure", 1, 0)
              | STATS total_failures = SUM(is_failure_as_number) BY my_grouping_name
              \`\`\`
              
              `
            ),
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.Assistant,
                content: '',
                function_call: {
                  name: 'get_esql_info',
                  arguments: JSON.stringify(args),
                  trigger: MessageRole.Assistant as const,
                },
              },
            },
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                name: 'get_esql_info',
                content: JSON.stringify({
                  documentation: messagesToInclude,
                }),
              },
            },
          ],
          connectorId,
          signal,
        }
      );

      return esqlResponse$.pipe(
        emitWithConcatenatedMessage((msg) => {
          const esqlQuery = correctCommonEsqlMistakes(msg.message.content, resources.logger).match(
            /```esql([\s\S]*?)```/
          )?.[1];

          return {
            ...msg,
            message: {
              ...msg.message,
              content: correctCommonEsqlMistakes(msg.message.content, resources.logger),
              ...(esqlQuery && args.execute
                ? {
                    function_call: {
                      name: 'execute_query',
                      arguments: JSON.stringify({ query: esqlQuery }),
                      trigger: MessageRole.Assistant as const,
                    },
                  }
                : {}),
            },
          };
        })
      );
    }
  );
}
