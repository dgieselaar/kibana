/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Chart,
  Datum,
  PartialTheme,
  Partition,
  PartitionLayout,
  Settings,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { useTraceExplorerSamplesFetchContext } from '../../../../context/api_fetch_context/trace_explorer_samples_fetch_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
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

  const nodes =
    criticalPath?.roots.map((root, depth) => {
      return {
        id: root.hash,
        value: root.duration,
        depth,
        layers: {
          [depth]: root.hash,
        },
      };
    }) ?? [];

  const points: any[] = [];
  const layers: any[] = [];

  const chartSize = {
    height: layers.length * 20,
    width: '100%',
  };

  const theme = useTheme();
  const chartTheme = useChartTheme();
  const themeOverrides: PartialTheme = {
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    partition: {
      fillLabel: {
        fontFamily: theme.eui.euiCodeFontFamily,
        clipText: true,
      },
      fontFamily: theme.eui.euiCodeFontFamily,
      minFontSize: 9,
      maxFontSize: 9,
    },
  };

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow>
        <Chart size={chartSize}>
          <Settings theme={[themeOverrides, ...chartTheme]} />
          <Partition
            id="critical_path_flamegraph"
            data={points}
            layers={layers}
            drilldown
            maxRowCount={1}
            layout={PartitionLayout.icicle}
            valueAccessor={(d: Datum) => d.value as number}
            valueFormatter={() => ''}
          />
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
