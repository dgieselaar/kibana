/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ClientRequestParamsOf,
  EndpointOf,
  ReturnOf,
  RouteRepositoryClient,
  ServerRoute,
  ServerRouteRepository,
} from '@kbn/server-route-repository';
import { formatRequest as formatRequestType } from '@kbn/server-route-repository';
import { formatRequest } from '@kbn/server-route-repository/target_node/format_request';
import * as t from 'io-ts';
import type { CoreSetup, CoreStart } from '../../../../../../src/core/public';
import type { FetchOptions } from '../../../common/fetch_options';
import type { APMServerRouteRepository } from '../../../server/routes/get_global_apm_server_route_repository';
import type {
  APMRouteHandlerResources,
  InspectResponse,
} from '../../../server/routes/typings';
import { callApi } from './callApi';

// @ts-expect-error cannot find module or correspondent type declarations
// The code and types are at separated folders on @kbn/server-route-repository
// so in order to do targeted imports they must me imported separately, and
// an error is expected here
export type APMClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type APMClient = RouteRepositoryClient<
  APMServerRouteRepository,
  APMClientOptions
>;

export type AutoAbortedAPMClient = RouteRepositoryClient<
  APMServerRouteRepository,
  Omit<APMClientOptions, 'signal'>
>;

export type APIReturnType<
  TEndpoint extends EndpointOf<APMServerRouteRepository>
> = ReturnOf<APMServerRouteRepository, TEndpoint> & {
  _inspect?: InspectResponse;
};

export type APIEndpoint = EndpointOf<APMServerRouteRepository>;

export type APIClientRequestParamsOf<
  TEndpoint extends EndpointOf<APMServerRouteRepository>
> = ClientRequestParamsOf<APMServerRouteRepository, TEndpoint>;

export type AbstractAPMRepository = ServerRouteRepository<
  APMRouteHandlerResources,
  {},
  Record<
    string,
    ServerRoute<string, t.Mixed | undefined, APMRouteHandlerResources, any, {}>
  >
>;

export type AbstractAPMClient = RouteRepositoryClient<
  AbstractAPMRepository,
  APMClientOptions
>;

export let callApmApi: APMClient = () => {
  throw new Error(
    'callApmApi has to be initialized before used. Call createCallApmApi first.'
  );
};

export function createCallApmApi(core: CoreStart | CoreSetup) {
  callApmApi = ((options) => {
    const { endpoint, ...opts } = options;
    const { params } = (options as unknown) as {
      params?: Partial<Record<string, any>>;
    };

    const { method, pathname } = formatRequest(
      endpoint,
      params?.path
    ) as ReturnType<typeof formatRequestType>;

    return callApi(core, {
      ...opts,
      method,
      pathname,
      body: params?.body,
      query: params?.query,
    });
  }) as APMClient;
}
