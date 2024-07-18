/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataOnboardingKibanaContext } from '../../hooks/use_kibana';

export function DataOnboardingContextProvider({
  context,
  children,
}: {
  context: DataOnboardingKibanaContext;
  children: React.ReactNode;
}) {
  return <KibanaContextProvider services={context}>{children}</KibanaContextProvider>;
}
