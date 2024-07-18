/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { DataOnboardingConfig } from './config';
import { DataOnboardingPlugin } from './plugin';
import type {
  DataOnboardingServerSetup,
  DataOnboardingServerStart,
  DataOnboardingSetupDependencies,
  DataOnboardingStartDependencies,
} from './types';

export type { DataOnboardingServerRouteRepository } from './routes/get_global_data_onboarding_server_route_repository';

export type { DataOnboardingServerSetup, DataOnboardingServerStart };

export const plugin: PluginInitializer<
  DataOnboardingServerSetup,
  DataOnboardingServerStart,
  DataOnboardingSetupDependencies,
  DataOnboardingStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<DataOnboardingConfig>) =>
  new DataOnboardingPlugin(pluginInitializerContext);
