/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type {
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantPublicSetup,
} from '@kbn/observability-ai-assistant-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface DataOnboardingSetupDependencies {
  observabilityShared: ObservabilitySharedPluginSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPublicSetup;
  data: DataPublicPluginSetup;
  dataViews: DataViewsPublicPluginSetup;
}

export interface DataOnboardingStartDependencies {
  observabilityShared: ObservabilitySharedPluginStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export interface DataOnboardingPublicSetup {}

export interface DataOnboardingPublicStart {}
