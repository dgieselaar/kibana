/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ML_PAGES } from '../../../../common/constants/locator';
import type { TimeSeriesExplorerAppState } from '../../../../common/types/locator';
import { usePageUrlState } from '../../util/url_state';

export function useTimeSeriesExplorerUrlState() {
  return usePageUrlState<TimeSeriesExplorerAppState>(ML_PAGES.SINGLE_METRIC_VIEWER);
}
