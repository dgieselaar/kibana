/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { InkRouter } from '@kbn/ink/router';
import type { AppContext, AppState } from './types';
import { App } from './app';
import { AppStateContextProvider } from './state/app_state_context_provider';

export function Root({
  state: defaultAppState,
  context: defaultContext,
}: {
  state: AppState;
  context: AppContext;
}) {
  return (
    <InkRouter>
      <AppStateContextProvider context={defaultContext} state={defaultAppState}>
        <App />
      </AppStateContextProvider>
    </InkRouter>
  );
}
