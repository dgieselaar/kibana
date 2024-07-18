/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { DataOnboardingPlugin } from './plugin';
import type {
  DataOnboardingPublicSetup,
  DataOnboardingPublicStart,
  DataOnboardingSetupDependencies,
  DataOnboardingStartDependencies,
  ConfigSchema,
} from './types';

export type { DataOnboardingPublicSetup, DataOnboardingPublicStart };

export const plugin: PluginInitializer<
  DataOnboardingPublicSetup,
  DataOnboardingPublicStart,
  DataOnboardingSetupDependencies,
  DataOnboardingStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new DataOnboardingPlugin(pluginInitializerContext);
