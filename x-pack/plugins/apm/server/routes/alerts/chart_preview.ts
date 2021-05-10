/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { unwrapEsResponse } from '../../../../observability/server';
import { configRt } from '../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { getTransactionDurationChartPreview } from '../../lib/alerts/chart_preview/get_transaction_duration';
import { getTransactionErrorCountChartPreview } from '../../lib/alerts/chart_preview/get_transaction_error_count';
import { getTransactionErrorRateChartPreview } from '../../lib/alerts/chart_preview/get_transaction_error_rate';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../create_apm_server_route';
import { createApmServerRouteRepository } from '../create_apm_server_route_repository';
import { rangeRt } from '../default_api_types';
import { getRuleEvaluationPreview } from '../../lib/alerts/chart_preview/get_rule_evaluation_preview';

const alertParamsRt = t.intersection([
  t.partial({
    aggregationType: t.union([
      t.literal('avg'),
      t.literal('95th'),
      t.literal('99th'),
    ]),
    serviceName: t.string,
    environment: t.string,
    transactionType: t.string,
  }),
  rangeRt,
]);

export type AlertParams = t.TypeOf<typeof alertParamsRt>;

const transactionErrorRateChartPreview = createApmServerRoute({
  endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_rate',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { _inspect, ...alertParams } = params.query;

    const errorRateChartPreview = await getTransactionErrorRateChartPreview({
      setup,
      alertParams,
    });

    return { errorRateChartPreview };
  },
});

const transactionErrorCountChartPreview = createApmServerRoute({
  endpoint: 'GET /api/apm/alerts/chart_preview/transaction_error_count',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;

    const { _inspect, ...alertParams } = params.query;

    const errorCountChartPreview = await getTransactionErrorCountChartPreview({
      setup,
      alertParams,
    });

    return { errorCountChartPreview };
  },
});

const transactionDurationChartPreview = createApmServerRoute({
  endpoint: 'GET /api/apm/alerts/chart_preview/transaction_duration',
  params: t.type({ query: alertParamsRt }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const { params } = resources;

    const { _inspect, ...alertParams } = params.query;

    const latencyChartPreview = await getTransactionDurationChartPreview({
      alertParams,
      setup,
    });

    return { latencyChartPreview };
  },
});

const ruleEvaluationPreview = createApmServerRoute({
  endpoint: 'POST /api/apm/alerts/rule_evaluation_preview',
  params: t.type({
    body: t.intersection([
      t.partial(
        {
          from: toNumberRt,
        },
        'from'
      ),
      t.type(
        {
          config: configRt,
        },
        'config'
      ),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async ({ params, context }) => {
    console.log(require('util').inspect(params.body, { depth: null }));

    const preview = await getRuleEvaluationPreview({
      config: params.body.config,
      from: params.body.from,
      to: Date.now(),
      clusterClient: {
        search: async (request) => {
          const body = await unwrapEsResponse(
            context.core.elasticsearch.client.asCurrentUser.search(request)
          );
          return body as any;
        },
      },
    });

    console.log(require('util').inspect(preview, { depth: null }));

    return {
      preview,
    };
  },
});

export const alertsChartPreviewRouteRepository = createApmServerRouteRepository()
  .add(transactionErrorRateChartPreview)
  .add(transactionDurationChartPreview)
  .add(transactionErrorCountChartPreview)
  .add(transactionDurationChartPreview)
  .add(ruleEvaluationPreview);
