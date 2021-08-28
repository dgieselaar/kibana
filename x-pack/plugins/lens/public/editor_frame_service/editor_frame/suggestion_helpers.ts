/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IconType } from '@elastic/eui/src/components/icon/icon';
import type { Ast } from '@kbn/interpreter/common';
import type { PaletteOutput } from '../../../../../../src/plugins/charts/common/palette';
import type { Datatable } from '../../../../../../src/plugins/expressions/common/expression_types/specs/datatable';
import type { VisualizeFieldContext } from '../../../../../../src/plugins/ui_actions/public/types';
import { layerTypes } from '../../../common/constants';
import type { LayerType } from '../../../common/types';
import type { DragDropIdentifier } from '../../drag_drop/providers/types';
import type { LensDispatch } from '../../state_management';
import { selectSuggestion, switchVisualization } from '../../state_management';
import type { DatasourceStates, VisualizationState } from '../../state_management/types';
import type {
  Datasource,
  DatasourceMap,
  DatasourcePublicAPI,
  DatasourceSuggestion,
  TableChangeType,
  TableSuggestion,
  Visualization,
  VisualizationMap,
} from '../../types';
import { getLayerType } from './config_panel/add_layer';

export interface Suggestion {
  visualizationId: string;
  datasourceState?: unknown;
  datasourceId?: string;
  columns: number;
  score: number;
  title: string;
  visualizationState: unknown;
  previewExpression?: Ast | string;
  previewIcon: IconType;
  hide?: boolean;
  changeType: TableChangeType;
  keptLayerIds: string[];
}

/**
 * This function takes a list of available data tables and a list of visualization
 * extensions and creates a ranked list of suggestions which contain a pair of a data table
 * and a visualization.
 *
 * Each suggestion represents a valid state of the editor and can be applied by creating an
 * action with `toSwitchAction` and dispatching it
 */
export function getSuggestions({
  datasourceMap,
  datasourceStates,
  visualizationMap,
  activeVisualizationId,
  subVisualizationId,
  visualizationState,
  field,
  visualizeTriggerFieldContext,
  activeData,
  mainPalette,
}: {
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  visualizationMap: VisualizationMap;
  activeVisualizationId: string | null;
  subVisualizationId?: string;
  visualizationState: unknown;
  field?: unknown;
  visualizeTriggerFieldContext?: VisualizeFieldContext;
  activeData?: Record<string, Datatable>;
  mainPalette?: PaletteOutput;
}): Suggestion[] {
  const datasources = Object.entries(datasourceMap).filter(
    ([datasourceId]) => datasourceStates[datasourceId] && !datasourceStates[datasourceId].isLoading
  );

  const layerTypesMap = datasources.reduce((memo, [datasourceId, datasource]) => {
    const datasourceState = datasourceStates[datasourceId].state;
    if (!activeVisualizationId || !datasourceState || !visualizationMap[activeVisualizationId]) {
      return memo;
    }
    const layers = datasource.getLayers(datasourceState);
    for (const layerId of layers) {
      const type = getLayerType(
        visualizationMap[activeVisualizationId],
        visualizationState,
        layerId
      );
      memo[layerId] = type;
    }
    return memo;
  }, {} as Record<string, LayerType>);

  const isLayerSupportedByVisualization = (layerId: string, supportedTypes: LayerType[]) =>
    supportedTypes.includes(layerTypesMap[layerId] ?? layerTypes.DATA);

  // Collect all table suggestions from available datasources
  const datasourceTableSuggestions = datasources.flatMap(([datasourceId, datasource]) => {
    const datasourceState = datasourceStates[datasourceId].state;
    let dataSourceSuggestions;
    if (visualizeTriggerFieldContext) {
      dataSourceSuggestions = datasource.getDatasourceSuggestionsForVisualizeField(
        datasourceState,
        visualizeTriggerFieldContext.indexPatternId,
        visualizeTriggerFieldContext.fieldName
      );
    } else if (field) {
      dataSourceSuggestions = datasource.getDatasourceSuggestionsForField(datasourceState, field);
    } else {
      dataSourceSuggestions = datasource.getDatasourceSuggestionsFromCurrentState(
        datasourceState,
        activeData
      );
    }
    return dataSourceSuggestions.map((suggestion) => ({ ...suggestion, datasourceId }));
  });

  // Pass all table suggestions to all visualization extensions to get visualization suggestions
  // and rank them by score
  return Object.entries(visualizationMap)
    .flatMap(([visualizationId, visualization]) => {
      const supportedLayerTypes = visualization.getSupportedLayers().map(({ type }) => type);
      return datasourceTableSuggestions
        .filter((datasourceSuggestion) => {
          const filteredCount = datasourceSuggestion.keptLayerIds.filter((layerId) =>
            isLayerSupportedByVisualization(layerId, supportedLayerTypes)
          ).length;
          // make it pass either suggestions with some ids left after filtering
          // or suggestion with already 0 ids before the filtering (testing purposes)
          return filteredCount || filteredCount === datasourceSuggestion.keptLayerIds.length;
        })
        .flatMap((datasourceSuggestion) => {
          const table = datasourceSuggestion.table;
          const currentVisualizationState =
            visualizationId === activeVisualizationId ? visualizationState : undefined;
          const palette =
            mainPalette ||
            (activeVisualizationId && visualizationMap[activeVisualizationId]?.getMainPalette
              ? visualizationMap[activeVisualizationId].getMainPalette?.(visualizationState)
              : undefined);

          return getVisualizationSuggestions(
            visualization,
            table,
            visualizationId,
            {
              ...datasourceSuggestion,
              keptLayerIds: datasourceSuggestion.keptLayerIds.filter((layerId) =>
                isLayerSupportedByVisualization(layerId, supportedLayerTypes)
              ),
            },
            currentVisualizationState,
            subVisualizationId,
            palette
          );
        });
    })
    .sort((a, b) => b.score - a.score);
}

export function getVisualizeFieldSuggestions({
  datasourceMap,
  datasourceStates,
  visualizationMap,
  activeVisualizationId,
  visualizationState,
  visualizeTriggerFieldContext,
}: {
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  visualizationMap: VisualizationMap;
  activeVisualizationId: string | null;
  subVisualizationId?: string;
  visualizationState: unknown;
  visualizeTriggerFieldContext?: VisualizeFieldContext;
}): Suggestion | undefined {
  const suggestions = getSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap,
    activeVisualizationId,
    visualizationState,
    visualizeTriggerFieldContext,
  });
  if (suggestions.length) {
    return suggestions.find((s) => s.visualizationId === activeVisualizationId) || suggestions[0];
  }
}

/**
 * Queries a single visualization extensions for a single datasource suggestion and
 * creates an array of complete suggestions containing both the target datasource
 * state and target visualization state along with suggestion meta data like score,
 * title and preview expression.
 */
function getVisualizationSuggestions(
  visualization: Visualization<unknown>,
  table: TableSuggestion,
  visualizationId: string,
  datasourceSuggestion: DatasourceSuggestion & { datasourceId: string },
  currentVisualizationState: unknown,
  subVisualizationId?: string,
  mainPalette?: PaletteOutput
) {
  return visualization
    .getSuggestions({
      table,
      state: currentVisualizationState,
      keptLayerIds: datasourceSuggestion.keptLayerIds,
      subVisualizationId,
      mainPalette,
    })
    .map(({ state, ...visualizationSuggestion }) => ({
      ...visualizationSuggestion,
      visualizationId,
      visualizationState: state,
      keptLayerIds: datasourceSuggestion.keptLayerIds,
      datasourceState: datasourceSuggestion.state,
      datasourceId: datasourceSuggestion.datasourceId,
      columns: table.columns.length,
      changeType: table.changeType,
    }));
}

export function switchToSuggestion(
  dispatchLens: LensDispatch,
  suggestion: Pick<
    Suggestion,
    'visualizationId' | 'visualizationState' | 'datasourceState' | 'datasourceId'
  >,
  type: 'SWITCH_VISUALIZATION' | 'SELECT_SUGGESTION' = 'SELECT_SUGGESTION'
) {
  const pickedSuggestion = {
    newVisualizationId: suggestion.visualizationId,
    initialState: suggestion.visualizationState,
    datasourceState: suggestion.datasourceState,
    datasourceId: suggestion.datasourceId!,
  };

  dispatchLens(
    type === 'SELECT_SUGGESTION'
      ? selectSuggestion(pickedSuggestion)
      : switchVisualization(pickedSuggestion)
  );
}

export function getTopSuggestionForField(
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  visualization: VisualizationState,
  datasourceStates: DatasourceStates,
  visualizationMap: Record<string, Visualization<unknown>>,
  datasource: Datasource,
  field: DragDropIdentifier
) {
  const hasData = Object.values(datasourceLayers).some(
    (datasourceLayer) => datasourceLayer.getTableSpec().length > 0
  );

  const mainPalette =
    visualization.activeId && visualizationMap[visualization.activeId]?.getMainPalette
      ? visualizationMap[visualization.activeId].getMainPalette?.(visualization.state)
      : undefined;
  const suggestions = getSuggestions({
    datasourceMap: { [datasource.id]: datasource },
    datasourceStates,
    visualizationMap:
      hasData && visualization.activeId
        ? { [visualization.activeId]: visualizationMap[visualization.activeId] }
        : visualizationMap,
    activeVisualizationId: visualization.activeId,
    visualizationState: visualization.state,
    field,
    mainPalette,
  });
  return suggestions.find((s) => s.visualizationId === visualization.activeId) || suggestions[0];
}
