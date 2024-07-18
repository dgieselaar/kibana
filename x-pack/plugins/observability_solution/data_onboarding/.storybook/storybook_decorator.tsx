/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType, useMemo } from 'react';
import { DataOnboardingContextProvider } from '../public/components/data_onboarding_context_provider';
import { getMockDataOnboardingContext } from './get_mock_data_onboarding_app_context';

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const context = useMemo(() => getMockDataOnboardingContext(), []);
  return (
    <DataOnboardingContextProvider context={context}>
      <Story />
    </DataOnboardingContextProvider>
  );
}
