/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import type { AppStateAPI } from './types';
import { AppStateContext } from './app_state_context_provider';

export function useAppState(): AppStateAPI {
  const api = useContext(AppStateContext);

  if (!api) {
    throw new Error(`AppState API context not set, make sure to use AppStateContextProvider`);
  }

  return api;
}
