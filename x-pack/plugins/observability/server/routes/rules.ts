/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isoToEpochRt, toNumberRt } from '@kbn/io-ts-utils';
import { AlertType } from '../../../apm/common/alert_types';
import { createObservabilityServerRoute } from './create_observability_server_route';
import { createObservabilityServerRouteRepository } from './create_observability_server_route_repository';
import { getTopAlerts } from '../lib/rules/get_top_alerts';
import { unwrapEsResponse } from '../utils/unwrap_es_response';
import { configRt } from '../../common/rules/alerting_dsl/alerting_dsl_rt';
import { getRuleEvaluationPreview } from '../lib/rules/metric_rule/get_rule_evaluation_preview';

const alertsListRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/rules/alerts/top',
  options: {
    tags: [],
  },
  params: t.type({
    query: t.intersection([
      t.type({
        start: isoToEpochRt,
        end: isoToEpochRt,
      }),
      t.partial({
        kuery: t.string,
        size: toNumberRt,
      }),
    ]),
  }),
  handler: async ({ ruleDataClient, context, params }) => {
    const {
      query: { start, end, kuery, size = 100 },
    } = params;

    return getTopAlerts({
      ruleDataClient,
      start,
      end,
      kuery,
      size,
    });
  },
});

const alertsDynamicIndexPatternRoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/rules/alerts/dynamic_index_pattern',
  options: {
    tags: [],
  },
  handler: async ({ ruleDataClient }) => {
    const reader = ruleDataClient.getReader({ namespace: 'observability' });

    return reader.getDynamicIndexPattern();
  },
});

const ruleEvaluationPreviewRoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/rules/rule_evaluation_preview',
  params: t.type({
    body: t.type({
      config: configRt,
      steps: t.array(t.type({ time: t.number })),
    }),
  }),
  options: {
    tags: [],
  },
  handler: async ({ params, context, ruleDataClient }) => {
    const preview = await getRuleEvaluationPreview({
      config: params.body.config,
      steps: params.body.steps,
      ruleDataClient,
      clusterClient: {
        search: async (request) => {
          const body = await unwrapEsResponse(
            context.core.elasticsearch.client.asCurrentUser.search(request)
          );
          return body as any;
        },
      },
    });

    return {
      preview,
    };
  },
});

const createRuleRoute = createObservabilityServerRoute({
  endpoint: 'PUT /api/observability/rules/create_rule',
  options: {
    tags: [],
  },
  params: t.type({
    body: t.type({
      name: t.string,
      actions: t.array(
        t.type({
          params: t.record(t.string, t.any),
          group: t.string,
          id: t.string,
        })
      ),
      config: configRt,
    }),
  }),
  handler: async ({ params, context }) => {
    const { actions, config, name } = params.body;

    const alertsClient = context.alerting.getAlertsClient();

    return alertsClient.create<{ config: t.TypeOf<typeof configRt> }>({
      data: {
        actions,
        params: {
          config,
        },
        consumer: 'apm',
        alertTypeId: AlertType.Metric,
        enabled: true,
        name,
        schedule: {
          interval: config.step ?? '1m',
        },
        notifyWhen: 'onActionGroupChange',
        tags: [],
        throttle: null,
      },
    });
  },
});

export const rulesRouteRepository = createObservabilityServerRouteRepository()
  .add(alertsListRoute)
  .add(alertsDynamicIndexPatternRoute)
  .add(ruleEvaluationPreviewRoute)
  .add(createRuleRoute);
