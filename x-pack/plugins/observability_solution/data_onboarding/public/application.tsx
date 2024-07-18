/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, CoreTheme } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { History } from 'history';
import React, { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import type { DataOnboardingStartDependencies } from './types';
import { dataOnboardingRouter } from './routes/config';
import { DataOnboardingKibanaContext } from './hooks/use_kibana';
import { DataOnboardingServices } from './services/types';
import { DataOnboardingContextProvider } from './components/data_onboarding_context_provider';

function Application({
  coreStart,
  history,
  pluginsStart,
  theme$,
  services,
}: {
  coreStart: CoreStart;
  history: History;
  pluginsStart: DataOnboardingStartDependencies;
  theme$: Observable<CoreTheme>;
  services: DataOnboardingServices;
}) {
  const theme = useMemo(() => {
    return { theme$ };
  }, [theme$]);

  const context: DataOnboardingKibanaContext = useMemo(
    () => ({
      core: coreStart,
      dependencies: {
        start: pluginsStart,
      },
      services,
    }),
    [coreStart, pluginsStart, services]
  );

  return (
    <KibanaThemeProvider theme={theme}>
      <DataOnboardingContextProvider context={context}>
        <RedirectAppLinks coreStart={coreStart}>
          <coreStart.i18n.Context>
            <RouterProvider history={history} router={dataOnboardingRouter as any}>
              <RouteRenderer />
            </RouterProvider>
          </coreStart.i18n.Context>
        </RedirectAppLinks>
      </DataOnboardingContextProvider>
    </KibanaThemeProvider>
  );
}

export { Application };
