/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { asTransactionRate } from '../../../../common/utils/formatters/duration';
import type { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { useApmBackendContext } from '../../../context/apm_backend/use_apm_backend_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useComparison } from '../../../hooks/use_comparison';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { useTimeRange } from '../../../hooks/use_time_range';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';

export function BackendThroughputChart({ height }: { height: number }) {
  const { backendName } = useApmBackendContext();

  const theme = useTheme();

  const {
    query: { rangeFrom, rangeTo, kuery, environment },
  } = useApmParams('/backends/:backendName/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { offset, comparisonChartTheme } = useComparison();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/backends/{backendName}/charts/throughput',
        params: {
          path: {
            backendName,
          },
          query: {
            start,
            end,
            offset,
            kuery,
            environment,
          },
        },
      });
    },
    [backendName, start, end, offset, kuery, environment]
  );

  const timeseries = useMemo(() => {
    const specs: Array<TimeSeries<Coordinate>> = [];

    if (data?.currentTimeseries) {
      specs.push({
        data: data.currentTimeseries,
        type: 'linemark',
        color: theme.eui.euiColorVis0,
        title: i18n.translate('xpack.apm.backendThroughputChart.chartTitle', {
          defaultMessage: 'Throughput',
        }),
      });
    }

    if (data?.comparisonTimeseries) {
      specs.push({
        data: data.comparisonTimeseries,
        type: 'area',
        color: theme.eui.euiColorMediumShade,
        title: i18n.translate(
          'xpack.apm.backendThroughputChart.previousPeriodLabel',
          { defaultMessage: 'Previous period' }
        ),
      });
    }

    return specs;
  }, [data, theme.eui.euiColorVis0, theme.eui.euiColorMediumShade]);

  return (
    <TimeseriesChart
      height={height}
      fetchStatus={status}
      id="throughputChart"
      customTheme={comparisonChartTheme}
      timeseries={timeseries}
      yLabelFormat={asTransactionRate}
    />
  );
}
