/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindActionResult } from '@kbn/actions-plugin/server';
import { useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { ObservabilityAIAssistantService } from '../types';
import { useAbortableAsync } from './use_abortable_async';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

export interface UseGenAIConnectorsResult {
  connectors?: FindActionResult[];
  selectedConnector?: string;
  loading: boolean;
  error?: Error;
  selectConnector: (id: string) => void;
  reloadConnectors: () => void;
}

export function useGenAIConnectors(): UseGenAIConnectorsResult {
  const assistant = useObservabilityAIAssistant();

  return useGenAIConnectorsWithoutContext(assistant);
}

export function useGenAIConnectorsWithoutContext(
  assistant: ObservabilityAIAssistantService
): UseGenAIConnectorsResult {
  const selectedConnector = useObservable(assistant.lastUsedConnector$);

  const connectors = useAbortableAsync(
    ({ signal }) => {
      return assistant.callApi('GET /internal/observability_ai_assistant/connectors', {
        signal,
      });
    },
    [assistant]
  );

  useEffect(() => {
    if (!connectors.value) {
      return;
    }

    if (!connectors.value.find((connector) => connector.id === selectedConnector)) {
      assistant.setLastUsedConnector(connectors.value[0]?.id);
    }
  }, [connectors.value, selectedConnector, assistant]);

  return {
    connectors: connectors.value,
    loading: connectors.loading,
    error: connectors.error,
    selectedConnector,
    selectConnector: (id: string) => {
      assistant.setLastUsedConnector(id);
    },
    reloadConnectors: () => {
      connectors.refresh();
    },
  };
}
