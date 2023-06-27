/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Configuration, OpenAIApi } from 'openai';
import type { OpenAIConfig } from './config';
import { pipeStreamingResponse } from './pipe_streaming_response';
import type { IOpenAIClient } from './types';

export class OpenAIClient implements IOpenAIClient {
  private readonly client: OpenAIApi;

  constructor(private readonly config: OpenAIConfig) {
    const clientConfig = new Configuration({
      apiKey: config.apiKey,
    });

    this.client = new OpenAIApi(clientConfig);
  }

  chatCompletion: IOpenAIClient['chatCompletion'] = {
    create: async (messages, streamOverride) => {
      const stream = streamOverride ?? true;

      const response = await this.client.createChatCompletion(
        {
          messages,
          model: this.config.model,
          stream,
          function_call: 'auto',
          functions: [
            {
              name: 'get_apm_chart',
              description:
                "Get a time-based line or bar chart for various APM metrics, like throughput, failure rate, or latency, for any service or all services, or any or all of its dependencies. If no environment is given, assume it should be over all environments. In KQL, escaping happens with double quotes, not single quotes. When in doubt, don't escape at all. This is very important! Suppose that you want to filter for the value opbeans-go for the service.name field. Best: `service.name:opbeans-go`. OK: `service.name:\"opbeans-go\"`. Wrong: `service.name:'opbeans-go'`. If you use grouping, make sure to include groupBy in the label for a specific series, this is very important. For instance, when grouping by service.node.name, use: `Avg latency for {{groupBy}}`, not: `Avg latency for host` or `Avg latency for {{service.node.name}}`",
              parameters: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'A title for the visualisation. Should be very concise.',
                  },
                  series: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: {
                          type: 'string',
                          description:
                            'A unique, human readable, concise Mustache template for this specific series. It needs to be unique. The only available variable is groupBy. Keep it as concise as possible, in many cases you only need groupBy.',
                        },
                        metric: {
                          description: 'The metric to be displayed',
                          oneOf: [
                            {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string',
                                  enum: [
                                    'transaction_throughput',
                                    'transaction_failure_rate',
                                    'exit_span_throughput',
                                    'exit_span_failure_rate',
                                  ],
                                },
                              },
                              required: ['name'],
                            },
                            {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string',
                                  enum: ['transaction_latency', 'exit_span_latency'],
                                },
                                function: {
                                  type: 'string',
                                  enum: ['avg', 'p95', 'p99'],
                                },
                              },
                              required: ['name', 'function'],
                            },
                          ],
                        },
                        start: {
                          type: 'string',
                          description:
                            'The start of the time range, in Elasticsearch date math, like `now`.',
                        },
                        end: {
                          type: 'string',
                          description:
                            'The end of the time range, in Elasticsearch date math, like `now-24h`.',
                        },
                        filter: {
                          type: 'string',
                          description:
                            'a KQL query to filter the data by. If no filter should be applied, leave it empty.',
                        },
                        groupBy: {
                          type: 'string',
                          description: 'Group data by this field.',
                        },
                      },
                      required: ['metric', 'start', 'end', 'label'],
                    },
                  },
                },
                required: ['series', 'title'],
              },
            },
          ],
        },
        ...(stream ? [{ responseType: 'stream' as const }] : [])
      );

      return stream ? pipeStreamingResponse(response) : response.data;
    },
  };
}
