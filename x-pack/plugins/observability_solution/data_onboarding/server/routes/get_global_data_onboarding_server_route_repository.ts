/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { datasetRoutes } from './datasets/route';
import { tasksRoutes } from './tasks/route';

export function getGlobalDataOnboardingServerRouteRepository() {
  return {
    ...datasetRoutes,
    ...tasksRoutes,
  };
}

export type DataOnboardingServerRouteRepository = ReturnType<
  typeof getGlobalDataOnboardingServerRouteRepository
>;
