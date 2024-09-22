/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { from, map, of } from 'rxjs';
import {
  AppMountParameters,
  APP_WRAPPER_CLASS,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { ENTITY_APP_ID } from '@kbn/deeplinks-observability/constants';
import { css } from '@emotion/css';
import { GlobalSearchResult } from '@kbn/global-search-plugin/public';
import type {
  ConfigSchema,
  InventoryPublicSetup,
  InventoryPublicStart,
  InventorySetupDependencies,
  InventoryStartDependencies,
} from './types';
import { InventoryServices } from './services/types';
import { createCallInventoryAPI } from './api';
import { createEntityFieldFormatterClass } from './components/entity_field_formatter';

export class InventoryPlugin
  implements
    Plugin<
      InventoryPublicSetup,
      InventoryPublicStart,
      InventorySetupDependencies,
      InventoryStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InventoryStartDependencies, InventoryPublicStart>,
    pluginsSetup: InventorySetupDependencies
  ): InventoryPublicSetup {
    const inventoryAPIClient = createCallInventoryAPI(coreSetup);

    pluginsSetup.observabilityShared.navigation.registerSections(
      from(coreSetup.getStartServices()).pipe(
        map(([coreStart, pluginsStart]) => {
          return [
            {
              label: '',
              sortKey: 101,
              entries: [
                {
                  label: i18n.translate('xpack.inventory.inventoryLinkTitle', {
                    defaultMessage: 'Entities',
                  }),
                  app: ENTITY_APP_ID,
                  path: '/',
                  matchPath(currentPath: string) {
                    return ['/', ''].some((testPath) => currentPath.startsWith(testPath));
                  },
                },
              ],
            },
          ];
        })
      )
    );

    coreSetup.application.register({
      id: ENTITY_APP_ID,
      title: i18n.translate('xpack.inventory.appTitle', {
        defaultMessage: 'Entities',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/entities',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: ['sideNav'],
      order: 8001,
      deepLinks: [
        {
          id: 'entities',
          title: i18n.translate('xpack.inventory.inventoryDeepLinkTitle', {
            defaultMessage: 'Entities',
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

        const services: InventoryServices = {
          inventoryAPIClient,
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

    pluginsSetup.fieldFormats.register([
      createEntityFieldFormatterClass({ inventoryAPIClient, coreSetup }),
    ]);

    const searchableTypes = ['service'];

    pluginsSetup.globalSearch.registerResultProvider({
      id: 'inventory_entities',
      getSearchableTypes: async () => {
        return searchableTypes;
      },
      find: ({ term, types }, { aborted$, maxResults, preference, client }) => {
        if (!term || term.length < 2) {
          return of();
        }

        if (types?.length && types.every((type) => !searchableTypes.includes(type))) {
          return of();
        }

        const controller = new AbortController();
        aborted$.subscribe(() => {
          controller.abort();
        });

        return from(
          inventoryAPIClient.fetch('GET /internal/inventory/entities/search', {
            signal: controller.signal,
            params: {
              query: {
                displayName: term,
                size: 3,
              },
            },
          })
        ).pipe(
          map(({ entities }): GlobalSearchResult[] => {
            return entities.map(({ entity, score }): GlobalSearchResult => {
              return {
                id: `entity/${entity.type}/${entity.displayName}`,
                score,
                type: entity.type,
                title: entity.displayName,
                url: `/app/entities/${entity.type}/${entity.displayName}`,
                icon: 'node',
              };
            });
          })
        );
      },
    });

    return {};
  }

  start(coreStart: CoreStart, pluginsStart: InventoryStartDependencies): InventoryPublicStart {
    return {};
  }
}
