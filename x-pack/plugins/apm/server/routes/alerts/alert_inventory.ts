/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { getTopAlerts } from '../../lib/alert_inventory/get_top_alerts';
import { createRoute } from '../create_route';
import { kueryRt, rangeRt } from '../default_api_types';

export const alertsDynamicIndexPatternRoute = createRoute({
  endpoint: 'GET /api/apm/alerts/inventory/dynamic_index_pattern',
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const client = await context.plugins.observability?.getAlertHistoryClient(
      request
    );

    if (!client) {
      throw Boom.notFound();
    }

    return client.getIndexPattern();
  },
});

export const topAlertsRoute = createRoute({
  endpoint: 'GET /api/apm/alerts/inventory/top',
  options: { tags: ['access:apm'] },
  params: t.type({
    query: t.intersection([kueryRt, rangeRt]),
  }),
  handler: async ({ context, request }) => {
    const client = await context.plugins.observability?.getAlertHistoryClient(
      request
    );

    if (!client) {
      throw Boom.notFound();
    }

    const {
      query: { kuery, start, end },
    } = context.params;

    return getTopAlerts({
      client,
      kuery,
      start,
      end,
    });
  },
});
