/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { FlyoutPositionMode } from '../components/chat/chat_flyout';

interface FlyoutState {
  flyoutPositionMode: FlyoutPositionMode;
}

export const defaultFlyoutState: FlyoutState = {
  flyoutPositionMode: 'overlay',
};

export const OBSERVABILITY_AI_ASSISTANT_LOCAL_STORAGE_KEY = 'observabilityAIAssistant_flyoutState';

export function useFlyoutState() {
  const [flyoutState = defaultFlyoutState, setFlyoutState, removeFlyoutState] = useLocalStorage(
    OBSERVABILITY_AI_ASSISTANT_LOCAL_STORAGE_KEY,
    defaultFlyoutState
  );
  return { flyoutState, setFlyoutState, removeFlyoutState };
}
