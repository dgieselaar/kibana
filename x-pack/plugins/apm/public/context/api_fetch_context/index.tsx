/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import { FetcherResult, useFetcher } from '../../hooks/use_fetcher';
import {
  APIClientRequestParamsOf,
  APIReturnType,
  APIEndpoint,
} from '../../services/rest/create_call_apm_api';

type FetchContextProviderProps<T extends APIEndpoint> = Pick<
  APIClientRequestParamsOf<T> & { params: {} },
  'params'
> & { children: React.ReactElement };

interface FetchContext<T extends APIEndpoint> {
  Context: React.Context<FetcherResult<APIReturnType<T>> | undefined>;
  Provider: React.FunctionComponent<FetchContextProviderProps<T>>;
  Hook: () => FetcherResult<APIReturnType<T>>;
}

export function createApiFetchContext<T extends APIEndpoint>(
  endpoint: T
): FetchContext<T> {
  const Context = createContext<FetcherResult<APIReturnType<T>> | undefined>(
    undefined
  );

  return {
    Context,
    Provider: ({ params, children }: FetchContextProviderProps<T>) => {
      const fetch = useFetcher(
        (callApmApi) => {
          return callApmApi(endpoint, {
            params,
          } as any);
        },
        [params]
      ) as FetcherResult<APIReturnType<T>>;

      return <Context.Provider value={fetch}>{children}</Context.Provider>;
    },
    Hook: () => {
      const fetch = React.useContext(Context);
      if (!fetch) {
        throw new Error('Context not found');
      }
      return fetch;
    },
  };
}
