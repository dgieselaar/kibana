/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpHandler } from '../../../../../../../../src/core/public/http/types';
import type {
  CategorizerStatus,
  LogEntryCategoriesDatasetStats,
} from '../../../../../common/http_api/log_analysis/results/log_entry_category_datasets_stats';
import {
  getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT,
  getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT,
  LOG_ANALYSIS_GET_LATEST_LOG_ENTRY_CATEGORY_DATASETS_STATS_PATH,
} from '../../../../../common/http_api/log_analysis/results/log_entry_category_datasets_stats';
import { decodeOrThrow } from '../../../../../common/runtime_types';

export { LogEntryCategoriesDatasetStats };

export const callGetLatestCategoriesDatasetsStatsAPI = async (
  {
    jobIds,
    startTime,
    endTime,
    includeCategorizerStatuses,
  }: {
    jobIds: string[];
    startTime: number;
    endTime: number;
    includeCategorizerStatuses: CategorizerStatus[];
  },
  fetch: HttpHandler
) => {
  const response = await fetch(LOG_ANALYSIS_GET_LATEST_LOG_ENTRY_CATEGORY_DATASETS_STATS_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT.encode({
        data: {
          jobIds,
          timeRange: { startTime, endTime },
          includeCategorizerStatuses,
        },
      })
    ),
  });

  return decodeOrThrow(getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT)(response);
};
