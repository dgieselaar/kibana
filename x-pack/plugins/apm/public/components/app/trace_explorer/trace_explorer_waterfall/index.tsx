/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useTraceExplorerSamplesFetchContext } from '../../../../context/api_fetch_context/trace_explorer_samples_fetch_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { fromQuery, push, toQuery } from '../../../shared/links/url_helpers';
import { useWaterfallFetcher } from '../../transaction_details/use_waterfall_fetcher';
import { WaterfallWithSummary } from '../../transaction_details/waterfall_with_summary';

export function TraceExplorerWaterfall() {
  const {
    query: {
      environment,
      traceId,
      transactionId,
      rangeFrom,
      rangeTo,
      detailTab,
      flyoutItemId,
      sampleRangeFrom = 0,
      sampleRangeTo = 0,
    },
  } = useApmParams('/traces/explorer/waterfall');

  const traceSamplesFetch = useTraceExplorerSamplesFetchContext();

  const filteredSamples = useMemo(() => {
    return (
      (sampleRangeTo > 0
        ? traceSamplesFetch?.data?.samples.filter(
            (sample) =>
              sample.duration >= sampleRangeFrom &&
              sample.duration <= sampleRangeTo
          )
        : traceSamplesFetch?.data?.samples) || []
    );
  }, [traceSamplesFetch?.data, sampleRangeFrom, sampleRangeTo]);

  const history = useHistory();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  useEffect(() => {
    const nextSample = filteredSamples[0];
    const nextWaterfallItemId = '';
    history.replace({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        traceId: nextSample?.traceId ?? '',
        transactionId: nextSample?.transactionId,
        waterfallItemId: nextWaterfallItemId,
      }),
    });
  }, [filteredSamples, history]);

  const { waterfall, status: waterfallStatus } = useWaterfallFetcher({
    traceId,
    transactionId,
    start,
    end,
  });

  const isLoading =
    traceSamplesFetch.status === FETCH_STATUS.LOADING ||
    waterfallStatus === FETCH_STATUS.LOADING ||
    waterfallStatus === FETCH_STATUS.NOT_INITIATED;

  return (
    <WaterfallWithSummary
      environment={environment}
      isLoading={isLoading}
      onSampleClick={(sample) => {
        push(history, {
          query: {
            traceId: sample.traceId,
            transactionId: sample.transactionId,
            flyoutItemId: '',
          },
        });
      }}
      onTabClick={(nextDetailTab) => {
        push(history, {
          query: {
            detailTab: nextDetailTab,
          },
        });
      }}
      traceSamples={filteredSamples}
      waterfall={waterfall}
      detailTab={detailTab}
      waterfallItemId={flyoutItemId}
      serviceName={waterfall.entryWaterfallTransaction?.doc.service.name}
      hideTabs
    />
  );
}
