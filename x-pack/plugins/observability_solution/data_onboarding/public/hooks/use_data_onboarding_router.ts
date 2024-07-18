/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import type { DataOnboardingRouter, DataOnboardingRoutes } from '../routes/config';
import { dataOnboardingRouter } from '../routes/config';
import { useKibana } from './use_kibana';

interface StatefulDataOnboardingRouter extends DataOnboardingRouter {
  push<T extends PathsOf<DataOnboardingRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<DataOnboardingRoutes, T>>
  ): void;
  replace<T extends PathsOf<DataOnboardingRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<DataOnboardingRoutes, T>>
  ): void;
}

export function useDataOnboardingRouter(): StatefulDataOnboardingRouter {
  const {
    core: {
      http,
      application: { navigateToApp },
    },
  } = useKibana();

  const link = (...args: any[]) => {
    // @ts-expect-error
    return dataOnboardingRouter.link(...args);
  };

  return useMemo<StatefulDataOnboardingRouter>(
    () => ({
      ...dataOnboardingRouter,
      push: (...args) => {
        const next = link(...args);
        navigateToApp('data_onboarding', { path: next, replace: false });
      },
      replace: (path, ...args) => {
        const next = link(path, ...args);
        navigateToApp('data_onboarding', { path: next, replace: true });
      },
      link: (path, ...args) => {
        return http.basePath.prepend('/app/data_onboarding' + link(path, ...args));
      },
    }),
    [navigateToApp, http.basePath]
  );
}
