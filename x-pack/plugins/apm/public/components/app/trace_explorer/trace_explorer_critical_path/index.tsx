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
  PrimitiveValue,
  Settings,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  euiPaletteForStatus,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { useTraceExplorerSamplesFetchContext } from '../../../../context/api_fetch_context/trace_explorer_samples_fetch_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { Span } from '../../../../../typings/es_schemas/ui/span';
import { ICriticalPathItem } from '../../../../../typings/critical_path';

const colors = euiPaletteForStatus(130).slice(30, 130);
const maxNumTraces = 50;
export function TraceExplorerCriticalPath() {
  const {
    query: { rangeFrom, rangeTo, sampleRangeFrom, sampleRangeTo },
  } = useApmParams('/traces/explorer/critical-path');

  const { data: traceSamplesData } = useTraceExplorerSamplesFetchContext();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data: criticalPathData } = useFetcher(
    (callApmApi) => {
      const from = sampleRangeFrom ?? 0;
      const to =
        (sampleRangeTo ?? 0) === 0 ? Number.MAX_VALUE : sampleRangeTo ?? 0;

      const traceIds = traceSamplesData?.samples
        .filter(
          (sample) => sample.duration >= from && sample.duration <= to
        )
        .map((sample) => sample.traceId);

      if (traceIds === undefined || !traceIds.length) {
        return Promise.resolve({ items: [] , sampleSize: 0});
      }

      return callApmApi('POST /internal/apm/traces/critical_path', {
        params: {
          body: {
            traceIds,
            start,
            end,
            maxNumTraces,
          },
        },
      });
    },
    [start, end, traceSamplesData, sampleRangeFrom, sampleRangeTo]
  );

  const criticalPath = criticalPathData ?? { items: [] , sampleSize: 0};
  const points = useMemo(() => {
    return criticalPath.items.map((item) => {
        return {
          id: item.hash,
          value: item.selfDuration,
          depth: item.depth,
          layers: item.layers,
        };
      });
  }, [criticalPath]);

  const overallValue = criticalPath.items.find(p => p.depth === 0)?.duration ?? 1;

  const layers = useMemo(() => {
    if (!points.length) {
      return [];
    }

    const itemsById = criticalPath.items.reduce(
      (mapping: Record<string, ICriticalPathItem>, item) => {
        const entry = { [item.hash]: item };
        return { ...mapping, ...entry };
      },
      {}
    );

    const maxDepth = Math.max(...points.map((point) => point.depth));

    return [...new Array(maxDepth + 2)].map((_, depth) => {
      return {
        groupByRollup: (d: Datum) => d.layers[depth],
        nodeLabel: (id: PrimitiveValue) => {
          const item = itemsById[id!];
          if (item) {
            if(item.docType === 'transaction'){
              const transaction = item.sampleDoc as Transaction;
              return `${transaction.service.name} - ${item.name}`;
            } else if(item.docType === 'span'){
              const span = item.sampleDoc as Span;
              return `${span.service.name} - ${item.name}`;
            } 
              
            return item.name;
          }
          return '';
        },
        showAccessor: (id: PrimitiveValue) => !!id,
        shape: {
          fillColor: (d: { dataName: string}) => {
            const value = itemsById[d.dataName].selfDuration;
            const idx = Math.max(0, Math.floor(100 * value / overallValue) % 101 - 1);
            return colors[idx];
          },
        },
      };
    });
  }, [points, criticalPath]);

  const chartSize = {
    height: layers.length * 15,
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
