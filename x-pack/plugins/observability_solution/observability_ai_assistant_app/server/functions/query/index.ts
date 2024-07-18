/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { cloneDeepWith, keyBy, mapValues, once, pick } from 'lodash';
import pLimit from 'p-limit';
import Path from 'path';
import { lastValueFrom, startWith } from 'rxjs';
import { promisify } from 'util';
import {
  correctCommonEsqlMistakes,
  FunctionVisibility,
  INLINE_ESQL_QUERY_REGEX,
  MessageRole,
} from '@kbn/observability-ai-assistant-plugin/common';
import {
  VisualizeESQLUserIntention,
  VISUALIZE_ESQL_USER_INTENTIONS,
} from '@kbn/observability-ai-assistant-plugin/common/functions/visualize_esql';
import {
  concatenateChatCompletionChunks,
  ConcatenatedMessage,
} from '@kbn/observability-ai-assistant-plugin/common/utils/concatenate_chat_completion_chunks';
import { emitWithConcatenatedMessage } from '@kbn/observability-ai-assistant-plugin/common/utils/emit_with_concatenated_message';
import { createFunctionResponseMessage } from '@kbn/observability-ai-assistant-plugin/common/utils/create_function_response_message';
import { GENERAL_SYSTEM_INSTRUCTIONS } from '@kbn/observability-ai-assistant-plugin/server';
import type { FunctionRegistrationParameters } from '..';
import { runAndValidateEsqlQuery } from './validate_esql_query';
import { queryResultToKeyValue } from './query_result_to_key_value';
import { CREATE_RULE_FUNCTION_NAME } from '../rule';

export const QUERY_FUNCTION_NAME = 'query';

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

export function registerQueryFunction({ functions, resources }: FunctionRegistrationParameters) {
  functions.registerInstruction(({ availableFunctionNames }) =>
    availableFunctionNames.includes(QUERY_FUNCTION_NAME)
      ? `You MUST use the "${QUERY_FUNCTION_NAME}" function when the user wants to:
  - visualize data
  - run any arbitrary query
  - breakdown or filter ES|QL queries that are displayed on the current page
  - convert queries from another language to ES|QL
  - asks general questions about ES|QL
  - create a rule (where ES|QL is suitable)

  DO NOT UNDER ANY CIRCUMSTANCES generate ES|QL queries or explain anything about the ES|QL query language yourself.
  DO NOT UNDER ANY CIRCUMSTANCES try to correct an ES|QL query yourself - always use the "${QUERY_FUNCTION_NAME}" function for this.

  If the user asks for a query, and one of the dataset info functions was called and returned no results, you should still call the query function to generate an example query.

  Even if the "${QUERY_FUNCTION_NAME}" function was used before that, follow it up with the "${QUERY_FUNCTION_NAME}" function. If a query fails, do not attempt to correct it yourself. Again you should call the "${QUERY_FUNCTION_NAME}" function,
  even if it has been called before.

  When the "visualize_query" function has been called, a visualization has been displayed to the user. DO NOT UNDER ANY CIRCUMSTANCES follow up a "visualize_query" function call with your own visualization attempt.
  If the "execute_query" function has been called, summarize these results for the user. The user does not see a visualization in this case.`
      : undefined
  );

  functions.registerFunction(
    {
      name: 'execute_query',
      visibility: FunctionVisibility.UserOnly,
      description:
        "Execute the results of an ES|QL query. Use this when the user doesn't want to see anything, but only wants you to summarize or act on it.",
      descriptionForUser: 'Execute the results of an ES|QL query.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
          },
        },
        required: ['query'],
      } as const,
    },
    async ({ arguments: { query } }) => {
      const client = (await resources.context.core).elasticsearch.client.asCurrentUser;
      const { error, errorMessages, rows, columns } = await runAndValidateEsqlQuery({
        query,
        client,
      });

      if (!!error) {
        return {
          content: {
            message: 'The query failed to execute',
            error,
            errorMessages,
          },
        };
      }

      return {
        content: {
          result: rows && columns ? queryResultToKeyValue({ rows, columns }) : [],
          description:
            "Do not regurgitate these results back to the user unless explicitly requested. Instead, use the information here to answer the user's question",
        },
      };
    }
  );
  functions.registerFunction(
    {
      name: QUERY_FUNCTION_NAME,
      description: `This function generates, executes and/or visualizes a query based on the user's request. It also explains how ES|QL works and how to convert queries from one language to another. Make sure you call one of the get_dataset functions first if you need index or field names. This function takes no input.`,
      visibility: FunctionVisibility.AssistantOnly,
    },
    async ({ messages, chat }, signal) => {
      const [systemMessage, esqlDocs] = await Promise.all([loadSystemMessage(), loadEsqlDocs()]);

      const withEsqlSystemMessage = (message?: string) => [
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.System,
            content: `${GENERAL_SYSTEM_INSTRUCTIONS}\n\n${systemMessage}\n${message ?? ''}`,
          },
        },
        // remove the query function request
        ...messages.filter((msg) => msg.message.role !== MessageRole.System),
      ];

      const userQuestion = messages
        .concat()
        .reverse()
        .find((message) => message.message.role === MessageRole.User && !message.message.name);

      const abbreviatedUserQuestion = userQuestion!.message.content!.substring(0, 50);

      const source$ = (
        await chat('classify_esql', {
          messages: withEsqlSystemMessage().concat(
            createFunctionResponseMessage({
              name: QUERY_FUNCTION_NAME,
              content: {},
            }).message,
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                content: `Use the classify_esql tool attached to this conversation
              to classify the user's request in the user message before this ("${abbreviatedUserQuestion}...").
              and get more information about specific functions and commands
              you think are candidates for answering the question.
              
              Examples for functions and commands:
              Do you need to group data? Request \`STATS\`.
              Extract data? Request \`DISSECT\` AND \`GROK\`.
<<<<<<< Updated upstream
              Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.

              ONLY use ${VisualizeESQLUserIntention.executeAndReturnResults} if you are absolutely sure
              it is executable. If one of the get_dataset_info functions were not called before, OR if
              one of the get_dataset_info functions returned no data, opt for an explanation only and
              mention that there is no data for these indices. You can still use
              ${VisualizeESQLUserIntention.generateQueryOnly} and generate an example ES|QL query.

              For determining the intention of the user, the following options are available:

              ${VisualizeESQLUserIntention.generateQueryOnly}: the user only wants to generate the query,
              but not run it, or they ask a general question about ES|QL.

              ${VisualizeESQLUserIntention.executeAndReturnResults}: the user wants to execute the query,
              and have the assistant return/analyze/summarize the results. they don't need a
              visualization.

              ${VisualizeESQLUserIntention.visualizeAuto}: The user wants to visualize the data from the
              query, but wants us to pick the best visualization type, or their preferred
              visualization is unclear.

              These intentions will display a specific visualization:
              ${VisualizeESQLUserIntention.visualizeBar}
              ${VisualizeESQLUserIntention.visualizeDonut}
              ${VisualizeESQLUserIntention.visualizeHeatmap}
              ${VisualizeESQLUserIntention.visualizeLine}
              ${VisualizeESQLUserIntention.visualizeArea}
              ${VisualizeESQLUserIntention.visualizeTable}
              ${VisualizeESQLUserIntention.visualizeTagcloud}
              ${VisualizeESQLUserIntention.visualizeTreemap}
              ${VisualizeESQLUserIntention.visualizeWaffle}
              ${VisualizeESQLUserIntention.visualizeXy}

              Some examples:

              "I want a query that ..." => ${VisualizeESQLUserIntention.generateQueryOnly}
              "... Just show me the query" => ${VisualizeESQLUserIntention.generateQueryOnly}
              "Create a query that ..." => ${VisualizeESQLUserIntention.generateQueryOnly}
              
              "Show me the avg of x" => ${VisualizeESQLUserIntention.executeAndReturnResults}
              "Show me the results of y" => ${VisualizeESQLUserIntention.executeAndReturnResults}
              "Display the sum of z" => ${VisualizeESQLUserIntention.executeAndReturnResults}

              "Show me the avg of x over time" => ${VisualizeESQLUserIntention.visualizeAuto}
              "I want a bar chart of ... " => ${VisualizeESQLUserIntention.visualizeBar}
              "I want to see a heat map of ..." => ${VisualizeESQLUserIntention.visualizeHeatmap}
              `,
=======
              Convert a column based on a set of conditionals? Request \`EVAL\` and \`CASE\`.`,
>>>>>>> Stashed changes
              },
            }
          ),
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
                    description:
                      'A list of processing or source commands that are referenced in the list of commands in this conversation',
                  },
                  functions: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description:
                      'A list of functions that are referenced in the list of functions in this conversation',
                  },
                  intention: {
                    type: 'string',
                    description: `What the user\'s intention is.`,
                    enum: VISUALIZE_ESQL_USER_INTENTIONS,
                  },
                },
                required: ['commands', 'functions', 'intention'],
              },
            },
          ],
          functionCall: 'classify_esql',
        })
      ).pipe(concatenateChatCompletionChunks());

      const response = await lastValueFrom(source$);

      if (!response.message.function_call.arguments) {
        resources.logger.debug(
          `LLM should have called "classify_esql", but instead responded with the following message: ${JSON.stringify(
            response.message
          )}`
        );
        throw new Error(
          'LLM did not call classify_esql function during query generation, execute the "query" function and try again'
        );
      }

      const args = JSON.parse(response.message.function_call.arguments) as {
        commands?: string[];
        functions?: string[];
        intention: VisualizeESQLUserIntention;
      };

      const keywords = [
        ...(args.commands ?? []),
        ...(args.functions ?? []),
        'SYNTAX',
        'OVERVIEW',
        'OPERATORS',
      ].map((keyword) => keyword.toUpperCase());

      const messagesToInclude = mapValues(pick(esqlDocs, keywords), ({ data }) => data);

      const queryFunctionResponseMessage = createFunctionResponseMessage({
        name: QUERY_FUNCTION_NAME,
        content: {},
        data: {
          // add the included docs for debugging
          documentation: {
            intention: args.intention,
            keywords,
            files: messagesToInclude,
          },
        },
      });

      const availableFunctionsInContext = functions.getActions().concat(
        functions
          .getFunctions()
          .filter(
            (fn) =>
              fn.definition.name === CREATE_RULE_FUNCTION_NAME ||
              fn.definition.name === 'visualize_query' ||
              fn.definition.name === 'execute_query'
          )
          .map((fn) => pick(fn.definition, 'name', 'description', 'parameters'))
      );

      const esqlResponse$ = await chat('answer_esql_question', {
        messages: [
          ...withEsqlSystemMessage().concat(queryFunctionResponseMessage.message),
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
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: 'Thank you for providing the ES|QL info. What can I help you with?',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: `Answer the user's question that was previously asked ("${abbreviatedUserQuestion}...") using the attached documentation.
                Take into account any previous errors for generating a query.

                Format any ES|QL query as follows:
                \`\`\`esql
                <query>
                \`\`\`



                When using GROK or DISSECT, DO NOT UNDER ANY CIRCUMSTANCES use identical field names for field
                extraction as the original column. This will result in an error.
                YOU MUST use a different name than the column for extracted fields.
  
                DO NOT UNDER ANY CIRCUMSTANCES use commands or functions that are not a capability of ES|QL
                as mentioned in the system message and documentation. When converting queries from one language
                to ES|QL, make sure that the functions are available and documented in ES|QL.
                E.g., for SPL's LEN, use LENGTH. For IF, use CASE.

                If you want to call one of the functions, make sure you generate the query in plain text first,
                and then call the function. This improves quality of output. Prefer "visualize_query" over
                "execute_query".
                `,
            },
          },
        ],
        signal,
        functions: availableFunctionsInContext,
      });

      return esqlResponse$.pipe(
        emitWithConcatenatedMessage(async (msg) => {
          function correctEsql(query: string) {
            const correction = correctCommonEsqlMistakes(query);
            if (correction.isCorrection) {
              resources.logger.debug(
                `Corrected query, from: \n${correction.input}\nto:\n${correction.output}`
              );
            }
            return correction.output;
          }

          msg.message.content = msg.message.content.replaceAll(
            INLINE_ESQL_QUERY_REGEX,
            (_match, query) => {
              const correction = correctEsql(query);
              return '```esql\n' + correction + '\n```';
            }
          );

          if (msg.message.function_call.name) {
            const parsedArguments = JSON.parse(msg.message.function_call.arguments);
            const correctedArguments = cloneDeepWith(parsedArguments, (value, key) => {
              if (typeof value !== 'string') {
                return value;
              }
              if (INLINE_ESQL_QUERY_REGEX.test(value)) {
                return value.replaceAll(INLINE_ESQL_QUERY_REGEX, (_match, query) =>
                  correctEsql(query)
                );
              }

              if (key === 'esql') {
                return correctEsql(value);
              }

              return value;
            });
            msg.message.function_call.arguments = JSON.stringify(correctedArguments);
            return msg;
          }

          const esqlQuery = msg.message.content.match(
            new RegExp(INLINE_ESQL_QUERY_REGEX, 'ms')
          )?.[1];

          let functionCall: ConcatenatedMessage['message']['function_call'] | undefined;

          if (
            !args.intention ||
            !esqlQuery ||
            args.intention === VisualizeESQLUserIntention.generateQueryOnly
          ) {
            functionCall = undefined;
          } else if (args.intention === VisualizeESQLUserIntention.executeAndReturnResults) {
            functionCall = {
              name: 'execute_query',
              arguments: JSON.stringify({ query: esqlQuery }),
              trigger: MessageRole.Assistant as const,
            };
          } else {
            functionCall = {
              name: 'visualize_query',
              arguments: JSON.stringify({ query: esqlQuery, intention: args.intention }),
              trigger: MessageRole.Assistant as const,
            };
          }

          return {
            ...msg,
            message: {
              ...msg.message,
              ...(functionCall
                ? {
                    function_call: functionCall,
                  }
                : {}),
            },
          };
        }),
        startWith(queryFunctionResponseMessage)
      );
    }
  );
}
