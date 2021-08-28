/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeepPartial } from '@reduxjs/toolkit';
import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import logger from 'redux-logger';
import { initMiddleware } from './init_middleware';
import { lensSlice } from './lens_slice';
import { optimizingMiddleware } from './optimizing_middleware';
import { timeRangeMiddleware } from './time_range_middleware';
import type { LensState, LensStoreDeps } from './types';

export * from './selectors';
export * from './types';

export const reducer = {
  lens: lensSlice.reducer,
};

export const {
  loadInitial,
  navigateAway,
  setState,
  setSaveable,
  onActiveDataChange,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  updateLayer,
  switchVisualization,
  selectSuggestion,
  rollbackSuggestion,
  submitSuggestion,
  switchDatasource,
  setToggleFullscreen,
} = lensSlice.actions;

export const makeConfigureStore = (
  storeDeps: LensStoreDeps,
  preloadedState: DeepPartial<LensState>
) => {
  const middleware = [
    ...getDefaultMiddleware({
      serializableCheck: false,
    }),
    initMiddleware(storeDeps),
    optimizingMiddleware(),
    timeRangeMiddleware(storeDeps.lensServices.data),
  ];
  if (process.env.NODE_ENV === 'development') middleware.push(logger);

  return configureStore({
    reducer,
    middleware,
    preloadedState,
  });
};

export type LensRootStore = ReturnType<typeof makeConfigureStore>;

export type LensDispatch = LensRootStore['dispatch'];
export type LensGetState = LensRootStore['getState'];
export type LensRootState = ReturnType<LensGetState>;

export const useLensDispatch = () => useDispatch<LensDispatch>();
export const useLensSelector: TypedUseSelectorHook<LensRootState> = useSelector;
