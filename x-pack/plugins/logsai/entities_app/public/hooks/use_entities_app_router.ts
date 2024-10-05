/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import type { EntitiesAppRouter, EntitiesAppRoutes } from '../routes/config';
import { entitiesAppRouter } from '../routes/config';
import { useKibana } from './use_kibana';

interface StatefulEntitiesAppRouter extends EntitiesAppRouter {
  push<T extends PathsOf<EntitiesAppRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<EntitiesAppRoutes, T>>
  ): void;
  replace<T extends PathsOf<EntitiesAppRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<EntitiesAppRoutes, T>>
  ): void;
}

export function useEntitiesAppRouter(): StatefulEntitiesAppRouter {
  const {
    core: {
      http,
      application: { navigateToApp },
    },
  } = useKibana();

  const link = (...args: any[]) => {
    // @ts-expect-error
    return entitiesAppRouter.link(...args);
  };

  return useMemo<StatefulEntitiesAppRouter>(
    () => ({
      ...entitiesAppRouter,
      push: (...args) => {
        const next = link(...args);
        navigateToApp('entities', { path: next, replace: false });
      },
      replace: (path, ...args) => {
        const next = link(path, ...args);
        navigateToApp('entities', { path: next, replace: true });
      },
      link: (path, ...args) => {
        return http.basePath.prepend('/app/entities' + link(path, ...args));
      },
    }),
    [navigateToApp, http.basePath]
  );
}
