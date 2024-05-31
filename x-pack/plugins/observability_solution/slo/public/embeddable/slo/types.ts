/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { SloPublicPluginsStart } from '../..';

export interface SloEmbeddableContext {
  coreStart: CoreStart;
  pluginsStart: SloPublicPluginsStart;
  children: React.ReactNode;
}
