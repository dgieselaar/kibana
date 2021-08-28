/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { PLUGIN_ID } from '../../../../common/constants/app';
import { useMlKibana } from './kibana_context';

export type NavigateToPath = ReturnType<typeof useNavigateToPath>;

export const useNavigateToPath = () => {
  const {
    services: {
      application: { getUrlForApp, navigateToUrl },
    },
  } = useMlKibana();

  const location = useLocation();

  return useCallback(
    async (path: string | undefined, preserveSearch = false) => {
      if (path === undefined) return;
      const modifiedPath = `${path}${preserveSearch === true ? location.search : ''}`;
      /**
       * Handle urls generated by MlUrlGenerator where '/app/ml' is automatically prepended
       */
      const url = modifiedPath.includes('/app/ml')
        ? modifiedPath
        : getUrlForApp(PLUGIN_ID, {
            path: modifiedPath,
          });
      await navigateToUrl(url);
    },
    [location]
  );
};
