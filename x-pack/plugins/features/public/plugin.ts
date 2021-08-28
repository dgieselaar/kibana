/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '../../../../src/core/public/types';
import type { Plugin } from '../../../../src/core/public/plugins/plugin';
import { FeaturesAPIClient } from './features_api_client';

export class FeaturesPlugin implements Plugin<FeaturesPluginSetup, FeaturesPluginStart> {
  private apiClient?: FeaturesAPIClient;

  public setup(core: CoreSetup) {
    this.apiClient = new FeaturesAPIClient(core.http);
  }

  public start() {
    return {
      getFeatures: () => this.apiClient!.getFeatures(),
    };
  }

  public stop() {}
}

export type FeaturesPluginSetup = ReturnType<FeaturesPlugin['setup']>;
export type FeaturesPluginStart = ReturnType<FeaturesPlugin['start']>;
