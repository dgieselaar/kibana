/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/public/mocks';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { DataOnboardingKibanaContext } from '../public/hooks/use_kibana';
import type { DataOnboardingServices } from '../public/services/types';

export function getMockDataOnboardingContext(): DeeplyMockedKeys<DataOnboardingKibanaContext> {
  const services: DeeplyMockedKeys<DataOnboardingServices> = {};

  const core = coreMock.createStart();

  return {
    core: core as any,
    dependencies: {
      start: {
        observabilityShared: {},
      },
    } as any,
    services,
  };
}
