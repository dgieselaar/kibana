/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ApmBase } from '@elastic/apm-rum';
import { modifyUrl } from '@kbn/std';
import type { InternalApplicationStart } from './application';

/** "GET protocol://hostname:port/pathname" */
const HTTP_REQUEST_TRANSACTION_NAME_REGEX = /^(GET|POST|PUT|HEAD|PATCH|DELETE|OPTIONS|CONNECT|TRACE)\s(.*)$/;

/**
 * This is the entry point used to boot the frontend when serving a application
 * that lives in the Kibana Platform.
 */

interface ApmConfig {
  // AgentConfigOptions is not exported from @elastic/apm-rum
  active?: boolean;
  globalLabels?: Record<string, string>;
}

interface StartDeps {
  application: InternalApplicationStart;
}

export class ApmSystem {
  private static kbnApp: string | undefined;
  private static kbnPage: string | undefined;
  /**
   * `apmConfig` would be populated with relevant APM RUM agent
   * configuration if server is started with elastic.apm.* config.
   */

  static getKbnPage() {
    return ApmSystem.kbnPage ?? '';
  }

  static getKbnApp() {
    return ApmSystem.kbnApp ?? '';
  }

  private readonly enabled: boolean;

  constructor(private readonly apmConfig?: ApmConfig, private readonly basePath = '') {
    this.enabled = apmConfig != null && !!apmConfig.active;
  }

  async setup() {
    if (!this.enabled) return;
    const { init, apm } = await import('@elastic/apm-rum');
    const { globalLabels, ...apmConfig } = this.apmConfig!;
    if (globalLabels) {
      apm.addLabels(globalLabels);
    }

    this.addHttpRequestNormalization(apm);

    let lastPageLoadOrRouteChangeTransaction: Transaction | undefined;

    apm.observe('transaction:start', (t) => {
      if (t.type === 'page-load' || t.type === 'route-change') {
        lastPageLoadOrRouteChangeTransaction = t;
      }
      if (lastPageLoadOrRouteChangeTransaction) {
        ApmSystem.kbnPage = lastPageLoadOrRouteChangeTransaction.name;
        apm.addLabels({
          kibana_page: ApmSystem.kbnPage,
        });
      }
    });

    init(apmConfig);
  }

  async start(start?: StartDeps) {
    if (!this.enabled || !start) return;
    /**
     * Register listeners for navigation changes and capture them as
     * route-change transactions after Kibana app is bootstrapped
     */
    start.application.currentAppId$.subscribe((appId) => {
      const apmInstance = (window as any).elasticApm;
      if (appId && apmInstance && typeof apmInstance.startTransaction === 'function') {
        ApmSystem.kbnApp = appId;
        apmInstance.addLabels({
          kibana_app: ApmSystem.kbnApp,
        });

        apmInstance.startTransaction(`/app/${appId}`, 'route-change', {
          managed: true,
          canReuse: true,
        });
      }
    });
  }

  /**
   * Adds an observer to the APM configuration for normalizing transactions of the 'http-request' type to remove the
   * hostname, protocol, port, and base path. Allows for coorelating data cross different deployments.
   */
  private addHttpRequestNormalization(apm: ApmBase) {
    apm.observe('transaction:end', (t) => {
      if (t.type !== 'http-request') {
        return;
      }

      /** Split URLs of the from "GET protocol://hostname:port/pathname" into method & hostname */
      const matches = t.name.match(HTTP_REQUEST_TRANSACTION_NAME_REGEX);
      if (!matches) {
        return;
      }

      const [, method, originalUrl] = matches;
      // Normalize the URL
      const normalizedUrl = modifyUrl(originalUrl, (parts) => {
        const isAbsolute = parts.hostname && parts.protocol && parts.port;
        // If the request was to a different host, port, or protocol then don't change anything
        if (
          isAbsolute &&
          (parts.hostname !== window.location.hostname ||
            parts.protocol !== window.location.protocol ||
            parts.port !== window.location.port)
        ) {
          return;
        }

        // Strip the protocol, hostnname, port, and protocol slashes to normalize
        parts.protocol = null;
        parts.hostname = null;
        parts.port = null;
        parts.slashes = false;

        // Replace the basePath if present in the pathname
        if (parts.pathname === this.basePath) {
          parts.pathname = '/';
        } else if (parts.pathname?.startsWith(`${this.basePath}/`)) {
          parts.pathname = parts.pathname?.slice(this.basePath.length);
        }
      });

      t.name = `${method} ${normalizedUrl}`;
    });
  }
}
