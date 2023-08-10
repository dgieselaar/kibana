/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { groupBy } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ApmPluginStartDeps } from '../../plugin';
import {
  callApmApi,
  createCallApmApi,
} from '../../services/rest/create_call_apm_api';

export function registerGetApmTimeseriesFunction({
  pluginsStart,
  coreStart,
}: {
  pluginsStart: ApmPluginStartDeps;
  coreStart: CoreStart;
}) {
  createCallApmApi(coreStart);

  pluginsStart.observabilityAIAssistant.registerFunction(
    {
      contexts: ['apm'],
      name: 'get_apm_timeseries',
      descriptionForUser: `Display different APM metrics, like throughput, failure rate, or latency, for any service or all services, or any or all of its dependencies, both as a timeseries and as a single statistic. Additionally, the function will return any changes, such as spikes, step and trend changes, or dips. You can also use it to compare data by requesting two different time ranges, or for instance two different service versions`,
      description: `Display different APM metrics, like throughput, failure rate, or latency, for any service or all services, or any or all of its dependencies, both as a timeseries and as a single statistic. Additionally, the function will return any changes, such as spikes, step and trend changes, or dips. You can also use it to compare data by requesting two different time ranges, or for instance two different service versions. In KQL, escaping happens with double quotes, not single quotes. Some characters that need escaping are: ':()\\\/\". Always put a field value in double quotes. Best: service.name:\"opbeans-go\". Wrong: service.name:opbeans-go. This is very important!`,
      parameters: {
        type: 'object',
        properties: {
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
          stats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                timeseries: {
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
                          ],
                        },
                        'transaction.type': {
                          type: 'string',
                          description: 'The transaction type',
                        },
                      },
                      required: ['name'],
                    },
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          enum: [
                            'exit_span_throughput',
                            'exit_span_failure_rate',
                            'exit_span_latency',
                          ],
                        },
                        'span.destination.service.resource': {
                          type: 'string',
                          description:
                            'The name of the downstream dependency for the service',
                        },
                      },
                      required: ['name'],
                    },
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          const: 'error_event_rate',
                        },
                      },
                      required: ['name'],
                    },
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          const: 'transaction_latency',
                        },
                        'transaction.type': {
                          type: 'string',
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
                'service.name': {
                  type: 'string',
                  description: 'The name of the service',
                },
                'service.environment': {
                  type: 'string',
                  description: 'The environment that the service is running in',
                },
                filter: {
                  type: 'string',
                  description:
                    'a KQL query to filter the data by. If no filter should be applied, leave it empty.',
                },
                title: {
                  type: 'string',
                  description:
                    'A unique, human readable, concise title for this specific group series.',
                },
                offset: {
                  type: 'string',
                  description:
                    'The offset. Right: 15m. 8h. 1d. Wrong: -15m. -8h. -1d.',
                },
              },
              required: [
                'service.name',
                'service.environment',
                'timeseries',
                'title',
              ],
            },
          },
        },
        required: ['stats', 'start', 'end'],
      } as const,
    },
    async ({ arguments: { stats, start, end } }, signal) => {
      const response = await callApmApi(
        'POST /internal/apm/assistant/get_apm_timeseries',
        {
          signal,
          params: {
            body: { stats: stats as any, start, end },
          },
        }
      );

      return response;
    },
    ({ arguments: args, response }) => {
      const groupedSeries = groupBy(response.data, (series) => series.group);

      return (
        <EuiFlexGroup direction="column">
          {Object.values(groupedSeries).map((groupSeries) => {
            const groupId = groupSeries[0].group;

            return (
              <EuiFlexItem grow={false} key={groupId}>
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem>
                    <EuiText size="m">{groupId}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      );
    }
  );
}
