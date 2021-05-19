/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type {
  EndpointOf,
  ReturnOf,
  ServerRoute,
  ServerRouteRepository,
  ClientRequestParamsOf,
} from '@kbn/server-route-repository';
import { CoreSetup, CoreStart, KibanaRequest, Logger } from 'kibana/server';
import { RuleDataClient } from '../../../rule_registry/server';

import { ObservabilityServerRouteRepository } from './get_global_observability_server_route_repository';
import { ObservabilityRequestHandlerContext } from '../types';

export { ObservabilityServerRouteRepository };

export interface ObservabilityRouteHandlerResources {
  core: {
    start: () => Promise<CoreStart>;
    setup: CoreSetup;
  };
  ruleDataClient: RuleDataClient;
  request: KibanaRequest;
  context: ObservabilityRequestHandlerContext;
  logger: Logger;
}

export interface ObservabilityRouteCreateOptions {
  options: {
    tags: string[];
  };
}

export type AbstractObservabilityServerRouteRepository = ServerRouteRepository<
  ObservabilityRouteHandlerResources,
  ObservabilityRouteCreateOptions,
  Record<
    string,
    ServerRoute<
      string,
      t.Mixed | undefined,
      ObservabilityRouteHandlerResources,
      any,
      ObservabilityRouteCreateOptions
    >
  >
>;

export type ObservabilityAPIClientRequestParamsOf<
  TEndpoint extends EndpointOf<ObservabilityServerRouteRepository>
> = ClientRequestParamsOf<ObservabilityServerRouteRepository, TEndpoint> extends { params: any }
  ? ClientRequestParamsOf<ObservabilityServerRouteRepository, TEndpoint>['params']
  : undefined;

export type ObservabilityAPIReturnType<
  TEndpoint extends EndpointOf<ObservabilityServerRouteRepository>
> = ReturnOf<ObservabilityServerRouteRepository, TEndpoint>;
