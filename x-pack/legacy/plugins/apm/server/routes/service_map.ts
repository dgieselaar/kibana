/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import Boom from 'boom';
import { setupRequest } from '../lib/helpers/setup_request';
import { createRoute } from './create_route';
import { rangeRt } from './default_api_types';
import { getServiceMapServiceNodeInfo } from '../lib/service_map/get_service_map_service_node_info';
import { getServiceMap } from '../lib/services/map';

export const serviceMapRoute = createRoute(() => ({
  path: '/api/apm/service-map',
  params: {
    query: rangeRt
  },
  handler: async ({ context }) => {
    if (context.config['xpack.apm.serviceMapEnabled']) {
      return getServiceMap();
    }
    return new Boom('Not found', { statusCode: 404 });
  }
}));

export const serviceMapServiceNodeRoute = createRoute(() => ({
  path: `/api/apm/service-map/service/{serviceName}`,
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      rangeRt,
      t.partial({
        environment: t.string
      })
    ])
  },
  handler: async ({ context, request }) => {
    if (!context.config['xpack.apm.serviceMapEnabled']) {
      throw Boom.notFound();
    }
    const setup = await setupRequest(context, request);

    const {
      query: { environment },
      path: { serviceName }
    } = context.params;

    return getServiceMapServiceNodeInfo({
      setup,
      serviceName,
      environment
    });
  }
}));
