/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useTraceExplorerSamplesFetchContext } from '../../../../context/api_fetch_context/trace_explorer_samples_fetch_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { CriticalPathChart } from '../../../shared/charts/critical_path_chart';

export function TraceExplorerCriticalPath() {
  const {
    query: {
      rangeFrom,
      rangeTo,
      sampleRangeFrom = 0,
      sampleRangeTo = 0,
      flyoutItemId,
    },
  } = useApmParams('/traces/explorer/critical-path');

  const { data: traceSamplesData, status: traceSamplesFetchStatus } =
    useTraceExplorerSamplesFetchContext();

  const traceIds = useMemo(() => {
    const samples =
      sampleRangeFrom > 0
        ? traceSamplesData?.samples.filter(
            (sample) =>
              sample.duration >= sampleRangeFrom &&
              sample.duration <= sampleRangeTo
          )
        : traceSamplesData?.samples;
    return samples?.map((sample) => sample.traceId);
  }, [traceSamplesData?.samples, sampleRangeFrom, sampleRangeTo]);

  if (!traceIds) {
    return <EuiText>{`No trace data available!`}</EuiText>;
  }

  return (
    <CriticalPathChart
      traceIds={traceIds}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      flyoutItemId={flyoutItemId}
      isLoading={traceSamplesFetchStatus === FETCH_STATUS.LOADING}
    />
  );
}
