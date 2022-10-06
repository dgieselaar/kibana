/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import { MessagePort } from 'node:worker_threads';
import { FlameGraphOptions } from './routes/get_flamegraph';

export interface ProfilingPluginSetupDeps {
  observability: ObservabilityPluginSetup;
  features: FeaturesPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginStartDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginStart {}

export type ProfilingRequestHandlerContext = RequestHandlerContext;

export type WorkerFlameGraphOptions = Omit<FlameGraphOptions, 'logger' | 'client'> & {
  hosts: string;
  username: string;
  password: string;
  port: MessagePort;
  childOf: string;
};
