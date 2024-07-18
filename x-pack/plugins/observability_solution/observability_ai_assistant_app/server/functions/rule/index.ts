/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QUERY_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions';
import type { OnlyEsqlQueryRuleParams } from '@kbn/stack-alerts-plugin/server/rule_types/es_query/types';
import { Comparator } from '@kbn/stack-alerts-plugin/common/comparator_types';
import { ES_QUERY_ID } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import {
  FunctionVisibility,
  INLINE_ESQL_QUERY_REGEX,
} from '@kbn/observability-ai-assistant-plugin/common';
import type { FunctionRegistrationParameters } from '..';

export const CREATE_RULE_FUNCTION_NAME = 'create_alerting_rule';

export function registerCreateRuleFunction({
  functions,
  resources: { request },
  pluginsStart: { alerting },
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: CREATE_RULE_FUNCTION_NAME,
      description: `Create alerting rules that can trigger notifications based on certain conditions.
        For ES|QL rules, make sure you've generated queries using the "${QUERY_FUNCTION_NAME}"
        function before this. Collect the right metric or keyword fields with one of the dataset
        functions. For the ES|QL rules, for each returned row, that has a value greater than zero,
        an alert will fire. This is similar to PromQL alerting, but with ES|QL syntax.`,
      visibility: FunctionVisibility.AssistantOnly,
      parameters: {
        type: 'object',
        properties: {
          rules: {
            type: 'array',
            items: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    ruleType: {
                      type: 'string',
                      const: 'esql',
                    },
                    name: {
                      type: 'string',
                    },
                    esql: {
                      type: 'string',
                      description:
                        'The ES|QL query. YOU MUST wrap this in backticks (```esql\n...\n```)',
                    },
                  },
                  required: ['ruleType', 'name', 'esql'],
                },
              ],
            },
          },
        },
        required: ['rules'],
      },
    } as const,
    async ({ arguments: { rules } }) => {
      const alertsClient = alerting.getRulesClientWithRequest(request);

      const createdRules = await Promise.all(
        rules.map((rule) => {
          switch (rule.ruleType) {
            case 'esql':
              return alertsClient.create<OnlyEsqlQueryRuleParams>({
                data: {
                  alertTypeId: ES_QUERY_ID,
                  name: rule.name,
                  enabled: true,
                  actions: [],
                  consumer: 'logs',
                  schedule: {
                    interval: '1m',
                  },
                  tags: [],
                  params: {
                    aggType: 'count',
                    groupBy: 'all',
                    timeWindowSize: 5,
                    timeWindowUnit: 'm',
                    thresholdComparator: Comparator.GT,
                    threshold: [0],
                    timeField: '@timestamp',
                    searchType: 'esqlQuery',
                    esqlQuery: {
                      esql: rule.esql.replaceAll(INLINE_ESQL_QUERY_REGEX, (_match, query) => query),
                    },
                    size: 100,
                    excludeHitsFromPreviousRun: false,
                  },
                },
              });
          }
        })
      );

      return {
        content: {
          summary: `The following rules were created:
          
          ${createdRules.map((rule) => `${rule.name} (id: ${rule.id})`).join('\n')}
          `,
        },
      };
    }
  );
}
