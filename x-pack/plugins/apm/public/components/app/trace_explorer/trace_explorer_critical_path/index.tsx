/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useTraceExplorerSamplesFetchContext } from '../../../../context/api_fetch_context/trace_explorer_samples_fetch_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { calculateCriticalPath, ICriticalPath } from './cpa_helper';

export function TraceExplorerCriticalPath() {
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/traces/explorer/critical-path');

  const { data: traceSamplesData } = useTraceExplorerSamplesFetchContext();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data: criticalPathData } = useFetcher(
    (callApmApi) => {
      const traceIds = traceSamplesData?.samples.map(
        (sample) => sample.traceId
      );

      if (traceIds === undefined) {
        return;
      }

      if (!traceIds.length) {
        return Promise.resolve({ criticalPath: [] });
      }

      return callApmApi('POST /internal/apm/traces/critical_path', {
        params: {
          body: {
            traceIds,
            start,
            end,
          },
        },
      });
    },
    [start, end, traceSamplesData]
  );

  let criticalPath: ICriticalPath | undefined;
  if (criticalPathData) {
    criticalPath = calculateCriticalPath(criticalPathData.criticalPath);
  }

  console.log({
    criticalPath,
  });

  return <></>;
}
