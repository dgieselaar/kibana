/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Filter, Query } from '@kbn/es-query';
import type { CoreStart } from '../../../../../src/core/public/types';
import { IndexPattern } from '../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import type {
  RefreshInterval,
  TimeRange,
} from '../../../../../src/plugins/data/common/query/timefilter/types';
import type { EmbeddableInput } from '../../../../../src/plugins/embeddable/common/types';
import type {
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../../src/plugins/embeddable/public/lib/embeddables/i_embeddable';
import type { JobId } from '../../common/types/anomaly_detection_jobs/job';
import type { EntityField } from '../../common/util/anomaly_utils';
import { isPopulatedObject } from '../../common/util/object_utils';
import type { MlDependencies } from '../application/app';
import type { SwimlaneType } from '../application/explorer/explorer_constants';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import { AnomalyDetectorService } from '../application/services/anomaly_detector_service';
import { AnomalyExplorerChartsService } from '../application/services/anomaly_explorer_charts_service';
import { AnomalyTimelineService } from '../application/services/anomaly_timeline_service';
import type { MlResultsService } from '../application/services/results_service';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
} from './constants';

export interface AnomalySwimlaneEmbeddableCustomInput {
  jobIds: JobId[];
  swimlaneType: SwimlaneType;
  viewBy?: string;
  perPage?: number;

  // Embeddable inputs which are not included in the default interface
  filters: Filter[];
  query: Query;
  refreshConfig: RefreshInterval;
  timeRange: TimeRange;
}

export type AnomalySwimlaneEmbeddableInput = EmbeddableInput & AnomalySwimlaneEmbeddableCustomInput;

export interface AnomalySwimlaneServices {
  anomalyDetectorService: AnomalyDetectorService;
  anomalyTimelineService: AnomalyTimelineService;
}

export type AnomalySwimlaneEmbeddableServices = [
  CoreStart,
  MlDependencies,
  AnomalySwimlaneServices
];

export interface AnomalySwimlaneEmbeddableCustomOutput {
  perPage?: number;
  fromPage?: number;
  interval?: number;
}

export type AnomalySwimlaneEmbeddableOutput = EmbeddableOutput &
  AnomalySwimlaneEmbeddableCustomOutput;

export interface EditSwimlanePanelContext {
  embeddable: IEmbeddable<AnomalySwimlaneEmbeddableInput, AnomalySwimlaneEmbeddableOutput>;
}

export interface SwimLaneDrilldownContext extends EditSwimlanePanelContext {
  /**
   * Optional data provided by swim lane selection
   */
  data?: AppStateSelectedCells;
}

export function isSwimLaneEmbeddable(arg: unknown): arg is SwimLaneDrilldownContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    isPopulatedObject(arg.embeddable, ['type']) &&
    arg.embeddable.type === ANOMALY_SWIMLANE_EMBEDDABLE_TYPE
  );
}

/**
 * Anomaly Explorer
 */
export interface AnomalyChartsEmbeddableCustomInput {
  jobIds: JobId[];
  maxSeriesToPlot: number;

  // Embeddable inputs which are not included in the default interface
  filters: Filter[];
  query: Query;
  refreshConfig: RefreshInterval;
  timeRange: TimeRange;
  severityThreshold?: number;
}

export type AnomalyChartsEmbeddableInput = EmbeddableInput & AnomalyChartsEmbeddableCustomInput;

export interface AnomalyChartsServices {
  anomalyDetectorService: AnomalyDetectorService;
  anomalyExplorerService: AnomalyExplorerChartsService;
  mlResultsService: MlResultsService;
}

export type AnomalyChartsEmbeddableServices = [CoreStart, MlDependencies, AnomalyChartsServices];
export interface AnomalyChartsCustomOutput {
  entityFields?: EntityField[];
  severity?: number;
  indexPatterns?: IndexPattern[];
}
export type AnomalyChartsEmbeddableOutput = EmbeddableOutput & AnomalyChartsCustomOutput;
export interface EditAnomalyChartsPanelContext {
  embeddable: IEmbeddable<AnomalyChartsEmbeddableInput, AnomalyChartsEmbeddableOutput>;
}
export interface AnomalyChartsFieldSelectionContext extends EditAnomalyChartsPanelContext {
  /**
   * Optional fields selected using anomaly charts
   */
  data?: EntityField[];
}
export function isAnomalyExplorerEmbeddable(
  arg: unknown
): arg is AnomalyChartsFieldSelectionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    isPopulatedObject(arg.embeddable, ['type']) &&
    arg.embeddable.type === ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE
  );
}
