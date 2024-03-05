/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import {
  AppMountParameters,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinksProvider } from '@kbn/shared-ux-link-redirect-app';
import type {
  ObservabilityAIAssistantAppPluginSetupDependencies,
  ObservabilityAIAssistantAppPluginStartDependencies,
  ObservabilityAIAssistantAppPublicSetup,
  ObservabilityAIAssistantAppPublicStart,
} from './types';
import { NavControl } from './components/nav_control.tsx';
import { ObservabilityAIAssistantAppServiceProvider } from './context/observability_ai_assistant_app_service_provider';
import { createAppService, ObservabilityAIAssistantAppService } from './service/create_app_service';
import { SharedProviders } from './utils/shared_providers';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConfigSchema {}

export class ObservabilityAIAssistantAppPlugin
  implements
    Plugin<
      ObservabilityAIAssistantAppPublicSetup,
      ObservabilityAIAssistantAppPublicStart,
      ObservabilityAIAssistantAppPluginSetupDependencies,
      ObservabilityAIAssistantAppPluginStartDependencies
    >
{
  logger: Logger;
  appService: ObservabilityAIAssistantAppService | undefined;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup,
    pluginsSetup: ObservabilityAIAssistantAppPluginSetupDependencies
  ): ObservabilityAIAssistantAppPublicSetup {
    coreSetup.application.register({
      id: 'observabilityAIAssistant',
      title: i18n.translate('xpack.observabilityAiAssistant.appTitle', {
        defaultMessage: 'Observability AI Assistant',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/observabilityAIAssistant',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: [],
      deepLinks: [
        {
          id: 'conversations',
          title: i18n.translate('xpack.observabilityAiAssistant.conversationsDeepLinkTitle', {
            defaultMessage: 'Conversations',
          }),
          path: '/conversations/new',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices() as Promise<
            [CoreStart, ObservabilityAIAssistantAppPluginStartDependencies, unknown]
          >,
        ]);

        ReactDOM.render(
          <Application
            {...appMountParameters}
            service={this.appService!}
            coreStart={coreStart}
            pluginsStart={pluginsStart as ObservabilityAIAssistantAppPluginStartDependencies}
          />,
          appMountParameters.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(appMountParameters.element);
        };
      },
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies
  ): ObservabilityAIAssistantAppPublicStart {
    const appService = (this.appService = createAppService({
      pluginsStart,
    }));

    coreStart.chrome.navControls.registerRight({
      mount: (element) => {
        ReactDOM.render(
          <SharedProviders
            coreStart={coreStart}
            pluginsStart={pluginsStart}
            service={appService}
            theme$={coreStart.theme.theme$}
          >
            <NavControl />
          </SharedProviders>,
          element,
          () => {}
        );

        return () => {};
      },
      // right before the user profile
      order: 1001,
    });

    pluginsStart.observabilityAIAssistant.service.register(async ({ registerRenderFunction }) => {
      const { registerFunctions } = await import('./functions');

      await registerFunctions({ pluginsStart, registerRenderFunction });
    });

    return {};
  }
}
