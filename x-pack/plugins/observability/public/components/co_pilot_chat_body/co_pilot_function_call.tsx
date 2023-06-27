/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Axis, Chart, LineSeries, niceTimeFormatter, Position, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useRef } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useChartTheme } from '@kbn/observability-shared-plugin/public';
import { enableInspectEsQueries } from '../../../common';
import { useKibana } from '../../utils/kibana_react';
import { isFiniteNumber } from '../../../common/utils/is_finite_number';

export function CoPilotFunctionCall({
  name,
  arguments: args,
  loading,
}: {
  name: string;
  arguments: string;
  loading: boolean;
}) {
  const {
    services: { http, uiSettings },
  } = useKibana();

  const inspectableEsQueriesEnabled: boolean = uiSettings.get(enableInspectEsQueries);

  const chartTheme = useChartTheme();

  const getCharts: () => Promise<any> = useCallback(() => {
    return http.post('/internal/apm/assistant/get_apm_chart', {
      body: JSON.stringify({
        now: Date.now(),
        args: JSON.parse(args),
      }),
      query: {
        _inspect: inspectableEsQueriesEnabled ? 'true' : 'false',
      },
    });
  }, [http, args, inspectableEsQueriesEnabled]);

  const hasLoaded = useRef(false);

  if (!loading && hasLoaded.current === false) {
    hasLoaded.current = true;
  }

  const charts = useAsync(() => {
    if (!hasLoaded.current) {
      return new Promise(() => {});
    }
    return getCharts();
  }, [hasLoaded.current, getCharts]);

  if (charts.error) {
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="warning" color="danger" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="danger">
            {charts.error.message}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (charts.loading || !charts.value) {
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.observability.coPilot.functionCall.functionLoadingMessage', {
            defaultMessage: 'Executing function...',
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const chartData: {
    title: string;
    series: Array<{ label: string; data: Array<{ x: number; y: number }> }>;
  } = charts.value;

  const times: number[] = [];
  const values: number[] = [];

  chartData.series
    .flatMap((serie) => serie.data)
    .forEach((coord) => {
      times.push(coord.x);
      if (isFiniteNumber(coord.y)) {
        values.push(coord.y);
      }
    });

  const minX = Math.min(...times);
  const maxX = Math.max(...times);

  const minY = Math.min(0, ...values);
  const maxY = Math.max(...values);

  const xFormatter = niceTimeFormatter([minX, maxX]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiText size="m">
          <strong>{chartData.title}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <Chart size={{ height: 400 }}>
          <Settings
            theme={chartTheme}
            showLegend
            legendPosition={Position.Bottom}
            xDomain={{ min: minX, max: maxX }}
          />
          <Axis id="x-axis" position={Position.Bottom} tickFormat={xFormatter} />
          <Axis
            id="y-axis"
            position={Position.Left}
            gridLine={{ visible: true }}
            tickFormat={(value) => value}
            labelFormat={(value) => value}
            domain={{
              min: minY,
              max: maxY,
            }}
            ticks={3}
          />
          {chartData.series.map((serie) => {
            return (
              <LineSeries data={serie.data} id={serie.label} yAccessors={['y']} xAccessor="x" />
            );
          })}
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
