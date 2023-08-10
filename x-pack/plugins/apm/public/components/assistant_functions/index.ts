/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmPluginStartDeps } from '../../plugin';
import { registerGetApmTimeseriesFunction } from './get_apm_timeseries';

export function registerAssistantFunctions({
  pluginsStart,
}: {
  pluginsStart: ApmPluginStartDeps;
}) {
  pluginsStart.observabilityAIAssistant.registerContext({
    name: 'apm',
    description: 'Tools for APM',
  });

  registerGetApmTimeseriesFunction({
    pluginsStart,
  });
}
