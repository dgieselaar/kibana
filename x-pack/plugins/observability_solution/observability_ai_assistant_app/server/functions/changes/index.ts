/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { orderBy } from 'lodash';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { AggregationsAutoDateHistogramAggregation } from '@elastic/elasticsearch/lib/api/types';
import { aiAssistantLogsIndexPattern } from '@kbn/observability-ai-assistant-plugin/server';
import { createElasticsearchClient } from '../../clients/elasticsearch';
import type { FunctionRegistrationParameters } from '..';
import {
  changesFunctionParameters,
  ChangesFunctionResponse,
} from '../../../common/functions/changes';
import { getMetricChanges } from './get_metric_changes';
import { getLogChanges } from './get_log_changes';

export const CHANGES_FUNCTION_NAME = 'changes';

function getImpactFromPValue(pValue: number) {
  if (pValue < 1e-6) {
    return 'high';
  }

  if (pValue < 0.001) {
    return 'medium';
  }

  return 'low';
}

export function registerChangesFunction({
  functions,
  resources: {
    logger,
    context: { core: corePromise },
  },
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: CHANGES_FUNCTION_NAME,
      description: 'Returns change points like spikes and dips for logs and metrics.',
      parameters: changesFunctionParameters,
    },
    async ({
      arguments: { start, end, logs = [], metrics = [] },
    }): Promise<ChangesFunctionResponse> => {
      if (logs.length === 0 && metrics.length === 0) {
        throw new Error('No metrics or logs were defined');
      }

      const core = await corePromise;

      const logsIndexPattern = await core.uiSettings.client.get(aiAssistantLogsIndexPattern);

      const client = createElasticsearchClient({
        client: core.elasticsearch.client.asCurrentUser,
        logger,
      });

      const commonFilters = [
        {
          range: {
            '@timestamp': {
              gte: start,
              lt: end,
            },
          },
        },
      ];

      const dateHistogram: AggregationsAutoDateHistogramAggregation = {
        field: '@timestamp',
        buckets: 100,
      };

      const [metricChanges, logChanges] = await Promise.all([
        Promise.all([
          ...metrics.map(async (metric) => {
            const changes = await getMetricChanges({
              index: metric.index,
              client,
              filters: [
                ...commonFilters,
                ...(metric.kqlFilter
                  ? [toElasticsearchQuery(fromKueryExpression(metric.kqlFilter))]
                  : []),
              ],
              groupBy: metric.groupBy ?? [],
              type: metric.type || 'count',
              field: metric.field,
              dateHistogram,
            });

            return changes.map((change) => ({
              name: metric.name,
              ...change,
            }));
          }),
        ]),
        Promise.all([
          ...logs.map(async (log) => {
            const changes = await getLogChanges({
              index: log.index || logsIndexPattern,
              client,
              filters: [
                ...commonFilters,
                ...(log.kqlFilter
                  ? [toElasticsearchQuery(fromKueryExpression(log.kqlFilter))]
                  : []),
              ],
              field: log.field ?? 'message',
              dateHistogram,
            });
            return changes.map((change) => ({
              name: log.name,
              ...change,
            }));
          }),
        ]),
      ]);

      const allMetricChanges = orderBy(metricChanges.flat(), [
        (item) => ('p_value' in item.changes ? item.changes.p_value : Number.POSITIVE_INFINITY),
      ]);

      function formatChangeForLlm(change: typeof allMetricChanges[0] | typeof allLogChanges[0]) {
        return {
          name: change.name,
          key: change.key,
          changes: {
            ...('p_value' in change.changes && change.changes.p_value
              ? { impact: getImpactFromPValue(change.changes.p_value) }
              : {}),
            type: change.changes.type,
            ...('time' in change.changes ? { time: change.changes.time } : {}),
          },
        };
      }

      const allMetricChangesWithoutTimeseries = allMetricChanges
        .flat()
        .map(formatChangeForLlm)
        .filter((change) => change.changes.type !== 'indeterminable')
        .slice(0, 15);

      const allLogChanges = orderBy(logChanges.flat(), [
        (item) => ('p_value' in item.changes ? item.changes.p_value : Number.POSITIVE_INFINITY),
      ])
        .filter((change) => change.changes.type !== 'indeterminable')
        .slice(0, 15);

      const allLogChangesWithoutTimeseries = allLogChanges.flat().map((change) => {
        return {
          ...formatChangeForLlm(change),
          pattern: change.pattern,
        };
      });

      return {
        content: {
          instructions: `The user is looking at a component that displays each change. For each change,
          they can see the type of change, the impact, the timestamp, the trend, and the label. When a
          change is marked as "indeterminate", it means the system could not identify any changes.
        
          Look carefully at the changes, and analyze them thoughtfully. Keep in mind that the user is
          already looking at a table that displays the results, so you don't need to regurgitate the
          results back to the user. Instead, focus on possible correlations, root cause analysis,
          and remediations.

          When listing changes, DO NOT mention \`changes.time\`.`,
          changes: {
            metrics: allMetricChangesWithoutTimeseries,
            logs: allLogChangesWithoutTimeseries,
          },
        },
        data: {
          changes: {
            metrics: allMetricChanges,
            logs: allLogChanges,
          },
        },
      };
    }
  );
}
