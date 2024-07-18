/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import {
  AppMountParameters,
  APP_WRAPPER_CLASS,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DATA_ONBOARDING_APP_ID } from '@kbn/deeplinks-observability/constants';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import React from 'react';
import ReactDOM from 'react-dom';
import { createCallDataOnboardingAPI } from './api';
import { DataOnboardingServices } from './services/types';
import type {
  ConfigSchema,
  DataOnboardingPublicSetup,
  DataOnboardingPublicStart,
  DataOnboardingSetupDependencies,
  DataOnboardingStartDependencies,
} from './types';

export class DataOnboardingPlugin
  implements
    Plugin<
      DataOnboardingPublicSetup,
      DataOnboardingPublicStart,
      DataOnboardingSetupDependencies,
      DataOnboardingStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<DataOnboardingStartDependencies, DataOnboardingPublicStart>,
    pluginsSetup: DataOnboardingSetupDependencies
  ): DataOnboardingPublicSetup {
    const apiClient = createCallDataOnboardingAPI(coreSetup);

    coreSetup.application.register({
      id: DATA_ONBOARDING_APP_ID,
      title: i18n.translate('xpack.dataOnboarding.appTitle', {
        defaultMessage: 'Data onboarding',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/data_onboarding',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: [],
      deepLinks: [
        {
          id: 'data_onboarding',
          title: i18n.translate('xpack.dataOnboarding.dataOnboardingDeepLinkTitle', {
            defaultMessage: 'Data onboarding',
          }),
          path: '/',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        const services: DataOnboardingServices = {
          apiClient,
        };

        ReactDOM.render(
          <Application
            coreStart={coreStart}
            history={appMountParameters.history}
            pluginsStart={pluginsStart}
            theme$={appMountParameters.theme$}
            services={services}
          />,
          appMountParameters.element
        );

        const appWrapperClassName = css`
          overflow: auto;
        `;

        const appWrapperElement = document.getElementsByClassName(APP_WRAPPER_CLASS)[1];

        appWrapperElement.classList.add(appWrapperClassName);

        return () => {
          ReactDOM.unmountComponentAtNode(appMountParameters.element);
          appWrapperElement.classList.remove(appWrapperClassName);
        };
      },
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: DataOnboardingStartDependencies
  ): DataOnboardingPublicStart {
    return {};
  }
}
