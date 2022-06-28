/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../../common/correlations/constants';
import { ProcessorEvent } from '../../../../../common/processor_event';
import { useTraceExplorerSamplesFetchContext } from '../../../../context/api_fetch_context/trace_explorer_samples_fetch_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useSampleChartSelection } from '../../../../hooks/use_sample_chart_selection';
import { useTheme } from '../../../../hooks/use_theme';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { DurationDistributionChartData } from '../../../shared/charts/duration_distribution_chart';
import { DurationDistributionChartWithScrubber } from '../../../shared/charts/duration_distribution_chart_with_scrubber';

export function TraceExplorerDistributionChart() {
  const { clearChartSelection, selectSampleFromChartSelection } =
    useSampleChartSelection();

  const euiTheme = useTheme();

  const {
    query,
    query: { rangeFrom, rangeTo, sampleRangeFrom = 0, sampleRangeTo = 0 },
  } = useApmParams('/traces/explorer/*');

  const { data: tracesSamplesData } = useTraceExplorerSamplesFetchContext();

  const markerCurrentEvent =
    'traceId' in query
      ? tracesSamplesData?.samples.find(
          (sample) => sample.traceId === query.traceId
        )?.duration
      : undefined;

  const selection: [number, number] | undefined =
    sampleRangeFrom >= 0 && sampleRangeTo > 0
      ? [sampleRangeFrom, sampleRangeTo]
      : undefined;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { status, data } = useFetcher(
    (callApmApi) => {
      const traceIds =
        tracesSamplesData?.samples.map((sample) => sample.traceId) ?? [];

      return callApmApi('POST /internal/apm/traces/distribution', {
        params: {
          body: {
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
            start,
            end,
            traceIds,
          },
        },
      });
    },
    [start, end, tracesSamplesData]
  );

  const hasData =
    (data?.allTracesDistribution.overallHistogram?.length ?? 0) > 0 ||
    (data?.failedTracesDistribution.overallHistogram?.length ?? 0) > 0;

  const chartData: DurationDistributionChartData[] = [
    {
      areaSeriesColor: euiTheme.eui.euiColorVis1,
      histogram: data?.allTracesDistribution.overallHistogram ?? [],
      id: i18n.translate(
        'xpack.apm.traceExplorerDistributionChart.allTracesLegendLabel',
        {
          defaultMessage: 'All traces',
        }
      ),
    },
    {
      areaSeriesColor: euiTheme.eui.euiColorVis7,
      histogram: data?.failedTracesDistribution?.overallHistogram ?? [],
      id: i18n.translate(
        'xpack.apm.traceExplorerDistributionChart.failedTracesLegendLabel',
        {
          defaultMessage: 'Failed traces',
        }
      ),
    },
  ];

  const percentileThresholdValue =
    data?.allTracesDistribution.percentileThresholdValue;

  return (
    <DurationDistributionChartWithScrubber
      chartData={chartData}
      eventType={ProcessorEvent.transaction}
      hasData={hasData}
      onChartSelection={selectSampleFromChartSelection}
      onClearSelection={clearChartSelection}
      status={status}
      markerCurrentEvent={markerCurrentEvent}
      percentileThresholdValue={percentileThresholdValue}
      selection={selection}
    />
  );
}
