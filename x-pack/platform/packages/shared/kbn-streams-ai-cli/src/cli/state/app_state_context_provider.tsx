/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import type { InferenceConnector } from '@kbn/inference-common';
import { useApp } from 'ink';
import { useInkRouter } from '@kbn/ink/router';
import type { AppContext, AppState, TimeRangeOption } from '../types';
import { computeTimeRangeBounds } from '../utils/time_ranges';
import type { AppStateAPI } from './types';

export const AppStateContext = React.createContext<AppStateAPI | undefined>(undefined);

export function AppStateContextProvider({
  state: defaultAppState,
  context: defaultContext,
  children,
}: {
  state: AppState;
  context: AppContext;
  children: React.ReactNode;
}) {
  const { back, go } = useInkRouter();

  const [appState, setAppState] = useState(defaultAppState);

  const [context, setContext] = useState(defaultContext);

  const { exit } = useApp();

  const setConnector = useCallback((connector: InferenceConnector) => {
    setAppState((prevAppState) => ({
      ...prevAppState,
      connector,
    }));

    setContext((prevContext) => ({
      ...prevContext,
      inferenceClient: prevContext.inferenceClient.bindTo({
        connectorId: connector.connectorId,
      }),
    }));
  }, []);

  const setTimeRange = useCallback((timeRange: TimeRangeOption) => {
    return setAppState((prevAppState) => ({
      ...prevAppState,
      timeRange: {
        option: timeRange,
        ...computeTimeRangeBounds(timeRange),
      },
    }));
  }, []);

  const api: AppStateAPI = useMemo(() => {
    return {
      state: appState,
      context,
      back,
      exit,
      go,
      setConnector,
      setTimeRange,
    };
  }, [appState, context, back, exit, go, setConnector, setTimeRange]);

  return <AppStateContext.Provider value={api} children={children} />;
}
