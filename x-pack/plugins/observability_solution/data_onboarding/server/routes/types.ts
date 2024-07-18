/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DataOnboardingSetupDependencies, DataOnboardingStartDependencies } from '../types';

export type DataOnboardingRequestHandlerContext = CustomRequestHandlerContext<{}>;

export interface DataOnboardingRouteHandlerResources {
  request: KibanaRequest;
  context: DataOnboardingRequestHandlerContext;
  logger: Logger;
  plugins: {
    [key in keyof DataOnboardingSetupDependencies]: {
      setup: Required<DataOnboardingSetupDependencies>[key];
    };
  } & {
    [key in keyof DataOnboardingStartDependencies]: {
      start: () => Promise<Required<DataOnboardingStartDependencies>[key]>;
    };
  };
}

export interface DataOnboardingRouteCreateOptions {
  options: {
    timeout?: {
      idleSocket?: number;
    };
    tags: [];
  };
}
