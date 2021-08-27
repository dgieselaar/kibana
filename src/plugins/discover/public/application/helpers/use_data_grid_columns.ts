/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo } from 'react';
import type { IUiSettingsClient } from '../../../../../core/public/ui_settings/types';
import type { Capabilities } from '../../../../../core/types/capabilities';
import { IndexPattern } from '../../../../data/common/index_patterns/index_patterns/index_pattern';
import type { IndexPatternsContract } from '../../../../data/common/index_patterns/index_patterns/index_patterns';
import type {
  AppState as ContextState,
  GetStateReturn as ContextGetStateReturn,
} from '../angular/context_state';
import { getStateColumnActions } from '../apps/main/components/doc_table/actions/columns';
import type {
  AppState as DiscoverState,
  GetStateReturn as DiscoverGetStateReturn,
} from '../apps/main/services/discover_state';

interface UseDataGridColumnsProps {
  capabilities: Capabilities;
  config: IUiSettingsClient;
  indexPattern: IndexPattern;
  indexPatterns: IndexPatternsContract;
  useNewFieldsApi: boolean;
  setAppState: DiscoverGetStateReturn['setAppState'] | ContextGetStateReturn['setAppState'];
  state: DiscoverState | ContextState;
}

export const useDataGridColumns = ({
  capabilities,
  config,
  indexPattern,
  indexPatterns,
  setAppState,
  state,
  useNewFieldsApi,
}: UseDataGridColumnsProps) => {
  const { onAddColumn, onRemoveColumn, onSetColumns, onMoveColumn } = useMemo(
    () =>
      getStateColumnActions({
        capabilities,
        config,
        indexPattern,
        indexPatterns,
        setAppState,
        state,
        useNewFieldsApi,
      }),
    [capabilities, config, indexPattern, indexPatterns, setAppState, state, useNewFieldsApi]
  );

  const columns = useMemo(() => {
    if (!state.columns) {
      return [];
    }
    return useNewFieldsApi ? state.columns.filter((col) => col !== '_source') : state.columns;
  }, [state, useNewFieldsApi]);

  return {
    columns,
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  };
};
