/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { ElasticsearchClient } from '@kbn/core/server';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  getAssistantServiceSummary,
  serviceSummaryRouteRt,
} from './assistant_service_summary';
import { getApmChartArgsRt, getAssistantApmChart } from './get_apm_chart';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import {
  downstreamDependenciesRouteRt,
  getAssistantDownstreamDependencies,
} from './assistant_downstream_dependencies_route';
import {
  correlationValuesRouteRt,
  getAssistantCorrelationValues,
} from './assistant_get_correlation_values';
import { errorRouteRt, getAssistantError } from './assistant_get_error';

const assistantGetApmChartRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_apm_chart',
  params: t.type({
    body: t.type({
      now: toNumberRt,
      args: getApmChartArgsRt,
    }),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{}> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const {
      body: { now, args },
    } = params;

    return getAssistantApmChart({
      now,
      args,
      apmEventClient,
    });
  },
});

const assistantServiceSummaryRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_service_summary',
  params: t.type({
    body: t.type({
      now: toNumberRt,
      args: serviceSummaryRouteRt,
    }),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{}> => {
    const {
      params,
      context,
      request,
      logger,
      plugins: { observability },
    } = resources;

    const [
      apmEventClient,
      annotationsClient,
      esClient,
      apmAlertsClient,
      mlClient,
    ] = await Promise.all([
      getApmEventClient(resources),
      observability.setup.getScopedAnnotationsClient(context, request),
      context.core.then(
        (coreContext): ElasticsearchClient =>
          coreContext.elasticsearch.client.asCurrentUser
      ),
      getApmAlertsClient(resources),
      getMlClient(resources),
    ]);

    const {
      body: { now, args },
    } = params;

    return getAssistantServiceSummary({
      now,
      args,
      apmEventClient,
      logger,
      esClient,
      annotationsClient,
      mlClient,
      apmAlertsClient,
    });
  },
});

const assistantDownstreamDependenciesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_downstream_dependencies',
  params: t.type({
    body: t.type({
      now: toNumberRt,
      args: downstreamDependenciesRouteRt,
    }),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{}> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const {
      body: { now, args },
    } = params;

    return getAssistantDownstreamDependencies({
      now,
      args,
      apmEventClient,
    });
  },
});

const assistantCorrelationsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_correlation_values',
  params: t.type({
    body: t.type({
      now: toNumberRt,
      args: correlationValuesRouteRt,
    }),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{}> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const {
      body: { now, args },
    } = params;

    return {
      content: await getAssistantCorrelationValues({
        now,
        args,
        apmEventClient,
      }),
    };
  },
});

const assistantGetErrorRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_error',
  params: t.type({
    body: t.type({
      now: toNumberRt,
      args: errorRouteRt,
    }),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{}> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const {
      body: { now, args },
    } = params;

    return {
      content: await getAssistantError({
        now,
        args,
        apmEventClient,
      }),
    };
  },
});

export const assistantRouteRepository = {
  ...assistantGetApmChartRoute,
  ...assistantServiceSummaryRoute,
  ...assistantDownstreamDependenciesRoute,
  ...assistantCorrelationsRoute,
  ...assistantGetErrorRoute,
};
