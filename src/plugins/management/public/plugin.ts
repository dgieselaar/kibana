/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import type { CoreSetup, CoreStart } from '../../../core/public';
import type {
  AppDeepLink,
  AppMountParameters,
  AppUpdater,
} from '../../../core/public/application/types';
import { AppNavLinkStatus, AppStatus } from '../../../core/public/application/types';
import type { Plugin } from '../../../core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { DEFAULT_APP_CATEGORIES } from '../../../core/utils/default_app_categories';
import type { HomePublicPluginSetup } from '../../home/public/plugin';
import { FeatureCatalogueCategory } from '../../home/public/services/feature_catalogue/feature_catalogue_registry';
import type { SharePluginSetup, SharePluginStart } from '../../share/public/plugin';
import { MANAGEMENT_APP_ID } from '../common/contants';
import { ManagementAppLocatorDefinition } from '../common/locator';
import {
  getSectionsServiceStartPrivate,
  ManagementSectionsService,
} from './management_sections_service';
import type { ManagementSetup, ManagementStart } from './types';
import { ManagementSection } from './utils/management_section';

interface ManagementSetupDependencies {
  home?: HomePublicPluginSetup;
  share: SharePluginSetup;
}

interface ManagementStartDependencies {
  share: SharePluginStart;
}

export class ManagementPlugin
  implements
    Plugin<
      ManagementSetup,
      ManagementStart,
      ManagementSetupDependencies,
      ManagementStartDependencies
    > {
  private readonly managementSections = new ManagementSectionsService();

  private readonly appUpdater = new BehaviorSubject<AppUpdater>(() => {
    const deepLinks: AppDeepLink[] = Object.values(this.managementSections.definedSections).map(
      (section: ManagementSection) => ({
        id: section.id,
        title: section.title,
        deepLinks: section.getAppsEnabled().map((mgmtApp) => ({
          id: mgmtApp.id,
          title: mgmtApp.title,
          path: mgmtApp.basePath,
          keywords: mgmtApp.keywords,
        })),
      })
    );

    return { deepLinks };
  });

  private hasAnyEnabledApps = true;

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { home, share }: ManagementSetupDependencies) {
    const kibanaVersion = this.initializerContext.env.packageInfo.version;
    const locator = share.url.locators.create(new ManagementAppLocatorDefinition());

    if (home) {
      home.featureCatalogue.register({
        id: 'stack-management',
        title: i18n.translate('management.stackManagement.managementLabel', {
          defaultMessage: 'Stack Management',
        }),
        description: i18n.translate('management.stackManagement.managementDescription', {
          defaultMessage: 'Your center console for managing the Elastic Stack.',
        }),
        icon: 'managementApp',
        path: '/app/management',
        showOnHomePage: false,
        category: FeatureCatalogueCategory.ADMIN,
        visible: () => this.hasAnyEnabledApps,
      });
    }

    core.application.register({
      id: MANAGEMENT_APP_ID,
      title: i18n.translate('management.stackManagement.title', {
        defaultMessage: 'Stack Management',
      }),
      order: 9040,
      euiIconType: 'logoElastic',
      category: DEFAULT_APP_CATEGORIES.management,
      updater$: this.appUpdater,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();

        return renderApp(params, {
          sections: getSectionsServiceStartPrivate(),
          kibanaVersion,
          setBreadcrumbs: coreStart.chrome.setBreadcrumbs,
        });
      },
    });

    return {
      sections: this.managementSections.setup(),
      locator,
    };
  }

  public start(core: CoreStart, plugins: ManagementStartDependencies) {
    this.managementSections.start({ capabilities: core.application.capabilities });
    this.hasAnyEnabledApps = getSectionsServiceStartPrivate()
      .getSectionsEnabled()
      .some((section) => section.getAppsEnabled().length > 0);

    if (!this.hasAnyEnabledApps) {
      this.appUpdater.next(() => {
        return {
          status: AppStatus.inaccessible,
          navLinkStatus: AppNavLinkStatus.hidden,
        };
      });
    }

    return {};
  }
}
