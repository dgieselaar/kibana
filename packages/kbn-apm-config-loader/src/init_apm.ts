/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loadConfiguration } from './config_loader';

export const initApm = (
  argv: string[],
  rootDir: string,
  isDistributable: boolean,
  serviceName: string
) => {
  const apmConfigLoader = loadConfiguration(argv, rootDir, isDistributable);
  const apmConfig = apmConfigLoader.getConfig(serviceName);

  // we want to only load the module when effectively used
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const apm = require('elastic-apm-node');

  // Filter out all user PII
  apm.addFilter((payload: Record<string, any>) => {
    try {
      if (payload.context?.user && typeof payload.context.user === 'object') {
        Object.keys(payload.context.user).forEach((key) => {
          payload.context.user[key] = '[REDACTED]';
        });
      }
    } catch (e) {
      // just silently ignore the error
    }
    return payload;
  });

  apm.addPatch(
    '@elastic/elasticsearch',
    (
      exports: { Client: any },
      agent: any,
      { version, enabled }: { version: string; enabled: boolean }
    ) => {
      if (enabled) {
        // eslint-disable-next-line
        exports.Client = class KibanaApmClient extends exports.Client {
          constructor(...args: any[]) {
            super(...args);

            this.on('request', () => {
              const currentTransaction = agent.currentTransaction;
              const bindingSpan = agent._instrumentation.bindingSpan;
              if (currentTransaction && bindingSpan && currentTransaction._labels) {
                bindingSpan.addLabels({
                  kibana_page: currentTransaction._labels.kibana_page ?? '',
                  kibana_app: currentTransaction._labels.kibana_app ?? '',
                });
              }
            });
          }
        };
      }
      return exports;
    }
  );

  apm.start(apmConfig);
};
