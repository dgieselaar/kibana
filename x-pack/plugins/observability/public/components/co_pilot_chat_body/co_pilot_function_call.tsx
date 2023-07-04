/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Axis, Chart, LineSeries, niceTimeFormatter, Position, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useChartTheme } from '@kbn/observability-shared-plugin/public';
import { ChatCompletionResponseMessage } from 'openai';
import React from 'react';
import { isFiniteNumber } from '../../../common/utils/is_finite_number';

export function CoPilotFunctionCall({
  message,
}: {
  message: ChatCompletionResponseMessage & { data: unknown };
}) {
  const chartTheme = useChartTheme();

  const chartData = message.data as {
    charts: Array<{
      title: string;
      series: Array<{ label: string; data: Array<{ x: number; y: number }> }>;
    }>;
  };

  const times: number[] = [];
  const values: number[] = [];

  chartData.charts[0].series
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
          <strong>{chartData.charts[0].title}</strong>
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
          {chartData.charts[0].series.map((serie) => {
            return (
              <LineSeries data={serie.data} id={serie.label} yAccessors={['y']} xAccessor="x" />
            );
          })}
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
