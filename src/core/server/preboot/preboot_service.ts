/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreContext } from '../core_context';
import type { InternalPrebootServicePreboot } from './types';

/** @internal */
export class PrebootService {
  private readonly promiseList: Array<Promise<{ shouldReloadConfig: boolean } | undefined>> = [];
  private waitUntilCanSetupPromise?: Promise<{ shouldReloadConfig: boolean }>;
  private isSetupOnHold = false;
  private readonly log = this.core.logger.get('preboot');

  constructor(private readonly core: CoreContext) {}

  public preboot(): InternalPrebootServicePreboot {
    return {
      isSetupOnHold: () => this.isSetupOnHold,
      holdSetupUntilResolved: (pluginName, reason, promise) => {
        if (this.waitUntilCanSetupPromise) {
          throw new Error('Cannot hold boot at this stage.');
        }

        this.log.info(`"${pluginName}" plugin is holding setup: ${reason}`);

        this.isSetupOnHold = true;

        this.promiseList.push(promise);
      },
      waitUntilCanSetup: () => {
        if (!this.waitUntilCanSetupPromise) {
          this.waitUntilCanSetupPromise = Promise.all(this.promiseList)
            .then((results) => ({
              shouldReloadConfig: results.some((result) => result?.shouldReloadConfig),
            }))
            .catch((err) => {
              this.log.error(err);
              throw err;
            })
            .finally(() => (this.isSetupOnHold = false));
        }

        return this.waitUntilCanSetupPromise;
      },
    };
  }

  public stop() {
    this.isSetupOnHold = false;
    this.promiseList.length = 0;
    this.waitUntilCanSetupPromise = undefined;
  }
}
