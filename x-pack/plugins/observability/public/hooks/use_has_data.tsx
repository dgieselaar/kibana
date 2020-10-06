/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { getDataHandler } from '../data_handler';
import { ObservabilityFetchDataPlugins } from '../typings';
import { FETCH_STATUS } from './use_fetcher';

type HasDataMap = Record<ObservabilityFetchDataPlugins, { status: FETCH_STATUS; data?: boolean }>;

const apps: ObservabilityFetchDataPlugins[] = ['apm', 'uptime', 'infra_logs', 'infra_metrics'];

const createDefaultMap = () => {
  return apps.reduce((prev, app) => {
    return {
      ...prev,
      [app]: {
        status: FETCH_STATUS.LOADING,
      },
    };
  }, {}) as HasDataMap;
};

const HasDataContext = React.createContext<{
  hasData: HasDataMap;
}>({ hasData: createDefaultMap() });

export function HasDataContextProvider({ children }: { children: React.ReactNode }) {
  const [hasData, setHasData] = useState(createDefaultMap());

  useEffect(() => {
    apps.forEach(async (app) => {
      try {
        const result = await getDataHandler(app)?.hasData();

        setHasData((prevState) => ({
          ...prevState,
          [app]: {
            status: FETCH_STATUS.SUCCESS,
            data: result,
          },
        }));
      } catch (err) {
        setHasData((prevState) => ({
          ...prevState,
          [app]: {
            status: FETCH_STATUS.FAILURE,
            data: undefined,
          },
        }));
      }
    });
  }, []);

  return <HasDataContext.Provider value={{ hasData }} children={children} />;
}

export function useHasData() {
  return useContext(HasDataContext);
}
