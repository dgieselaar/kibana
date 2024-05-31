/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { InvestigatePlugin } from './plugin';
import type {
  InvestigatePublicSetup,
  InvestigatePublicStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies,
  ConfigSchema,
  OnWidgetAdd,
  WidgetRenderAPI,
} from './types';

export type { InvestigatePublicSetup, InvestigatePublicStart, OnWidgetAdd, WidgetRenderAPI };

export {
  type InvestigateTimeline,
  type InvestigateWidget,
  type InvestigateWidgetCreate,
  InvestigateWidgetColumnSpan,
  type GlobalWidgetParameters,
  type InvestigateUser,
  type WorkflowBlock,
} from '../common/types';

export { createWidgetFactory } from './create_widget';

export const plugin: PluginInitializer<
  InvestigatePublicSetup,
  InvestigatePublicStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new InvestigatePlugin(pluginInitializerContext);
