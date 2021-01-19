/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { useEnvironmentsFetcher } from '../../hooks/use_environments_fetcher';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { useUrlParams } from '../url_params_context/use_url_params';

export const EnvironmentContext = React.createContext<{
  status: FETCH_STATUS;
  availableEnvironments: undefined | string[];
  selectedEnvironment: string;
}>({
  status: FETCH_STATUS.NOT_INITIATED,
  availableEnvironments: undefined,
  selectedEnvironment: ENVIRONMENT_ALL.value,
});

export function EnvironmentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { uiFilters, urlParams } = useUrlParams();

  const { environment } = uiFilters;

  const { start, end } = urlParams;

  const { serviceName } = useParams<{ serviceName?: string }>();

  const { environments, status } = useEnvironmentsFetcher({
    serviceName,
    start,
    end,
  });

  const value = useMemo(() => {
    return {
      availableEnvironments: environments,
      selectedEnvironment: environment || ENVIRONMENT_ALL.value,
      status,
    };
  }, [environments, environment, status]);

  // render rest of application and pass down license via context
  return <EnvironmentContext.Provider value={value} children={children} />;
}
