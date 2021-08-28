/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { BehaviorSubject, combineLatest, merge, Observable, of, ReplaySubject } from 'rxjs';
import { flatMap, map, takeUntil } from 'rxjs/operators';
import { parse } from 'url';
import type { InternalApplicationStart } from '../application/types';
import type { DocLinksStart } from '../doc_links/doc_links_service';
import type { HttpStart } from '../http/types';
import type { InjectedMetadataStart } from '../injected_metadata/injected_metadata_service';
import type { NotificationsStart } from '../notifications/notifications_service';
import { mountReactNode } from '../utils/mount';
import { KIBANA_ASK_ELASTIC_LINK } from './constants';
import type { ChromeDocTitle } from './doc_title/doc_title_service';
import { DocTitleService } from './doc_title/doc_title_service';
import type { ChromeNavControls } from './nav_controls/nav_controls_service';
import { NavControlsService } from './nav_controls/nav_controls_service';
import type { ChromeNavLink } from './nav_links/nav_link';
import { NavLinksService } from './nav_links/nav_links_service';
import type { ChromeRecentlyAccessed } from './recently_accessed/recently_accessed_service';
import { RecentlyAccessedService } from './recently_accessed/recently_accessed_service';
import type {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeHelpExtension,
  ChromeUserBanner,
  InternalChromeStart,
} from './types';
import { Header } from './ui/header/header';

export type { ChromeNavControls, ChromeRecentlyAccessed, ChromeDocTitle };

const IS_LOCKED_KEY = 'core.chrome.isLocked';
const SNAPSHOT_REGEX = /-snapshot/i;

interface ConstructorParams {
  browserSupportsCsp: boolean;
  kibanaVersion: string;
}

interface StartDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
  http: HttpStart;
  injectedMetadata: InjectedMetadataStart;
  notifications: NotificationsStart;
}

/** @internal */
export class ChromeService {
  private isVisible$!: Observable<boolean>;
  private isForceHidden$!: BehaviorSubject<boolean>;
  private readonly stop$ = new ReplaySubject(1);
  private readonly navControls = new NavControlsService();
  private readonly navLinks = new NavLinksService();
  private readonly recentlyAccessed = new RecentlyAccessedService();
  private readonly docTitle = new DocTitleService();

  constructor(private readonly params: ConstructorParams) {}

  /**
   * These observables allow consumers to toggle the chrome visibility via either:
   *   1. Using setIsVisible() to trigger the next chromeHidden$
   *   2. Setting `chromeless` when registering an application, which will
   *      reset the visibility whenever the next application is mounted
   *   3. Having "embed" in the query string
   */
  private initVisibility(application: StartDeps['application']) {
    // Start off the chrome service hidden if "embed" is in the hash query string.
    const isEmbedded = 'embed' in parse(location.hash.slice(1), true).query;
    this.isForceHidden$ = new BehaviorSubject(isEmbedded);

    const appHidden$ = merge(
      // For the isVisible$ logic, having no mounted app is equivalent to having a hidden app
      // in the sense that the chrome UI should not be displayed until a non-chromeless app is mounting or mounted
      of(true),
      application.currentAppId$.pipe(
        flatMap((appId) =>
          application.applications$.pipe(
            map((applications) => {
              return !!appId && applications.has(appId) && !!applications.get(appId)!.chromeless;
            })
          )
        )
      )
    );
    this.isVisible$ = combineLatest([appHidden$, this.isForceHidden$]).pipe(
      map(([appHidden, forceHidden]) => !appHidden && !forceHidden),
      takeUntil(this.stop$)
    );
  }

  public async start({
    application,
    docLinks,
    http,
    injectedMetadata,
    notifications,
  }: StartDeps): Promise<InternalChromeStart> {
    this.initVisibility(application);

    const helpExtension$ = new BehaviorSubject<ChromeHelpExtension | undefined>(undefined);
    const breadcrumbs$ = new BehaviorSubject<ChromeBreadcrumb[]>([]);
    const breadcrumbsAppendExtension$ = new BehaviorSubject<
      ChromeBreadcrumbsAppendExtension | undefined
    >(undefined);
    const badge$ = new BehaviorSubject<ChromeBadge | undefined>(undefined);
    const customNavLink$ = new BehaviorSubject<ChromeNavLink | undefined>(undefined);
    const helpSupportUrl$ = new BehaviorSubject<string>(KIBANA_ASK_ELASTIC_LINK);
    const isNavDrawerLocked$ = new BehaviorSubject(localStorage.getItem(IS_LOCKED_KEY) === 'true');

    const getKbnVersionClass = () => {
      // we assume that the version is valid and has the form 'X.X.X'
      // strip out `SNAPSHOT` and reformat to 'X-X-X'
      const formattedVersionClass = this.params.kibanaVersion
        .replace(SNAPSHOT_REGEX, '')
        .split('.')
        .join('-');
      return `kbnVersion-${formattedVersionClass}`;
    };

    const headerBanner$ = new BehaviorSubject<ChromeUserBanner | undefined>(undefined);
    const bodyClasses$ = combineLatest([headerBanner$, this.isVisible$!]).pipe(
      map(([headerBanner, isVisible]) => {
        return [
          'kbnBody',
          headerBanner ? 'kbnBody--hasHeaderBanner' : 'kbnBody--noHeaderBanner',
          isVisible ? 'kbnBody--chromeVisible' : 'kbnBody--chromeHidden',
          getKbnVersionClass(),
        ];
      })
    );

    const navControls = this.navControls.start();
    const navLinks = this.navLinks.start({ application, http });
    const recentlyAccessed = await this.recentlyAccessed.start({ http });
    const docTitle = this.docTitle.start({ document: window.document });

    // erase chrome fields from a previous app while switching to a next app
    application.currentAppId$.subscribe(() => {
      helpExtension$.next(undefined);
      breadcrumbs$.next([]);
      badge$.next(undefined);
      docTitle.reset();
    });

    const setIsNavDrawerLocked = (isLocked: boolean) => {
      isNavDrawerLocked$.next(isLocked);
      localStorage.setItem(IS_LOCKED_KEY, `${isLocked}`);
    };

    const getIsNavDrawerLocked$ = isNavDrawerLocked$.pipe(takeUntil(this.stop$));

    const isIE = () => {
      const ua = window.navigator.userAgent;
      const msie = ua.indexOf('MSIE '); // IE 10 or older
      const trident = ua.indexOf('Trident/'); // IE 11

      return msie > 0 || trident > 0;
    };

    if (!this.params.browserSupportsCsp && injectedMetadata.getCspConfig().warnLegacyBrowsers) {
      notifications.toasts.addWarning({
        title: mountReactNode(
          <FormattedMessage
            id="core.chrome.legacyBrowserWarning"
            defaultMessage="Your browser does not meet the security requirements for Kibana."
          />
        ),
      });
    }

    if (isIE()) {
      notifications.toasts.addWarning({
        title: mountReactNode(
          <FormattedMessage
            id="core.chrome.browserDeprecationWarning"
            defaultMessage="Support for Internet Explorer will be dropped in future versions of this software, please check {link}."
            values={{
              link: (
                <EuiLink target="_blank" href="https://www.elastic.co/support/matrix" external>
                  <FormattedMessage
                    id="core.chrome.browserDeprecationLink"
                    defaultMessage="the support matrix on our website"
                  />
                </EuiLink>
              ),
            }}
          />
        ),
      });
    }

    return {
      navControls,
      navLinks,
      recentlyAccessed,
      docTitle,

      getHeaderComponent: () => (
        <Header
          loadingCount$={http.getLoadingCount$()}
          application={application}
          headerBanner$={headerBanner$.pipe(takeUntil(this.stop$))}
          badge$={badge$.pipe(takeUntil(this.stop$))}
          basePath={http.basePath}
          breadcrumbs$={breadcrumbs$.pipe(takeUntil(this.stop$))}
          breadcrumbsAppendExtension$={breadcrumbsAppendExtension$.pipe(takeUntil(this.stop$))}
          customNavLink$={customNavLink$.pipe(takeUntil(this.stop$))}
          kibanaDocLink={docLinks.links.kibana}
          forceAppSwitcherNavigation$={navLinks.getForceAppSwitcherNavigation$()}
          helpExtension$={helpExtension$.pipe(takeUntil(this.stop$))}
          helpSupportUrl$={helpSupportUrl$.pipe(takeUntil(this.stop$))}
          homeHref={http.basePath.prepend('/app/home')}
          isVisible$={this.isVisible$}
          kibanaVersion={injectedMetadata.getKibanaVersion()}
          navLinks$={navLinks.getNavLinks$()}
          recentlyAccessed$={recentlyAccessed.get$()}
          navControlsLeft$={navControls.getLeft$()}
          navControlsCenter$={navControls.getCenter$()}
          navControlsRight$={navControls.getRight$()}
          onIsLockedUpdate={setIsNavDrawerLocked}
          isLocked$={getIsNavDrawerLocked$}
        />
      ),

      getIsVisible$: () => this.isVisible$,

      setIsVisible: (isVisible: boolean) => this.isForceHidden$.next(!isVisible),

      getBadge$: () => badge$.pipe(takeUntil(this.stop$)),

      setBadge: (badge: ChromeBadge) => {
        badge$.next(badge);
      },

      getBreadcrumbs$: () => breadcrumbs$.pipe(takeUntil(this.stop$)),

      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbs$.next(newBreadcrumbs);
      },

      getBreadcrumbsAppendExtension$: () => breadcrumbsAppendExtension$.pipe(takeUntil(this.stop$)),

      setBreadcrumbsAppendExtension: (
        breadcrumbsAppendExtension?: ChromeBreadcrumbsAppendExtension
      ) => {
        breadcrumbsAppendExtension$.next(breadcrumbsAppendExtension);
      },

      getHelpExtension$: () => helpExtension$.pipe(takeUntil(this.stop$)),

      setHelpExtension: (helpExtension?: ChromeHelpExtension) => {
        helpExtension$.next(helpExtension);
      },

      setHelpSupportUrl: (url: string) => helpSupportUrl$.next(url),

      getIsNavDrawerLocked$: () => getIsNavDrawerLocked$,

      getCustomNavLink$: () => customNavLink$.pipe(takeUntil(this.stop$)),

      setCustomNavLink: (customNavLink?: ChromeNavLink) => {
        customNavLink$.next(customNavLink);
      },

      setHeaderBanner: (headerBanner?: ChromeUserBanner) => {
        headerBanner$.next(headerBanner);
      },

      getBodyClasses$: () => bodyClasses$.pipe(takeUntil(this.stop$)),
    };
  }

  public stop() {
    this.navLinks.stop();
    this.stop$.next();
  }
}
