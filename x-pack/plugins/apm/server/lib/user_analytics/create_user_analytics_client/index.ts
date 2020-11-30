/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlSearch } from '@elastic/elasticsearch/api/requestParams';

import { KibanaRequest, IScopedClusterClient } from 'src/core/server';
import { userAnalyticsConfig } from '../../../../common/user_analytics';
import {
  ESFilter,
  ESSearchHit,
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../../typings/elasticsearch';
import { callClientWithDebug } from '../../helpers/create_es_client/call_client_with_debug';

const index = userAnalyticsConfig.index;

interface EQLSearchParams {
  event_category_field?: string;
  timestamp_field?: string;
  tiebreaker_field?: string;
  size?: number;
  fetch_size?: number;
  filter?: ESFilter;
  query: string;
}

interface EQLSearchResponse<TDocument extends unknown> {
  is_partial: boolean;
  is_running: boolean;
  took: number;
  timed_out: boolean;
  hits: {
    total: {
      value: number;
      relation: 'eq' | 'gte';
    };
    sequences: Array<{
      join_keys: string[] | number[];
      events: Array<ESSearchHit<TDocument>>;
    }>;
  };
}

export function createUserAnalyticsClient({
  esClient,
  request,
  debug,
}: {
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  debug: boolean;
}) {
  return {
    async search<TParams extends Omit<ESSearchRequest, 'index'>>(
      params: TParams
    ): Promise<ESSearchResponse<unknown, TParams>> {
      return callClientWithDebug({
        apiCaller: (_, searchParams) =>
          esClient.asCurrentUser.search(searchParams),
        operationName: 'search',
        params: {
          ...params,
          index,
        },
        request,
        debug,
      }).then((res) => res.body);
    },
    eql: {
      async search<TDocument extends unknown>(
        body: EQLSearchParams
      ): Promise<EQLSearchResponse<TDocument>> {
        return callClientWithDebug({
          apiCaller: (_, params) =>
            esClient.asCurrentUser.eql.search(params as EqlSearch),
          operationName: 'eql/search',
          params: {
            body,
            index,
          },
          request,
          debug,
        }).then((res) => res.body);
      },
    },
  };
}

export type UserAnalyticsClient = ReturnType<typeof createUserAnalyticsClient>;
