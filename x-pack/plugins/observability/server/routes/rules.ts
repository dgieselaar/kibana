/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isoToEpochRt, toNumberRt } from '@kbn/io-ts-utils';
import { getRuleEvaluationPreview } from '../../../apm/server';
import { configRt } from '../../../apm/common/rules/alerting_dsl/alerting_dsl_rt';
import { createObservabilityServerRoute } from './create_observability_server_route';
import { createObservabilityServerRouteRepository } from './create_observability_server_route_repository';
import { getTopAlerts } from '../lib/rules/get_top_alerts';
import { unwrapEsResponse } from '../utils/unwrap_es_response';

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
    body: t.intersection([
      t.partial({
        from: toNumberRt,
      }),
      t.type({
        config: configRt,
        to: toNumberRt,
      }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async ({ params, context, ruleDataClient }) => {
    const ruleDataWriter = ruleDataClient.getWriter();

    const preview = await getRuleEvaluationPreview({
      config: params.body.config,
      from: params.body.from,
      to: Date.now(),
      ruleDataWriter,
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

export const rulesRouteRepository = createObservabilityServerRouteRepository()
  .add(alertsListRoute)
  .add(alertsDynamicIndexPatternRoute)
  .add(ruleEvaluationPreviewRoute);
