/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AreaSeriesStyle, BarSeriesStyle, RecursivePartial } from '@elastic/charts';
import { AreaSeries, BarSeries, ScaleType } from '@elastic/charts';
import React from 'react';
import { Color, colorTransformer } from '../../../../../common/color_palette';
import type { MetricsExplorerSeries } from '../../../../../common/http_api/metrics_explorer';
import type { MetricsExplorerOptionsMetric } from '../hooks/use_metrics_explorer_options';
import { MetricsExplorerChartType } from '../hooks/use_metrics_explorer_options';
import { createMetricLabel } from './helpers/create_metric_label';
import { getMetricId } from './helpers/get_metric_id';

type NumberOrString = string | number;

interface Props {
  metric: MetricsExplorerOptionsMetric;
  id: NumberOrString | NumberOrString[];
  series: MetricsExplorerSeries;
  type: MetricsExplorerChartType;
  stack: boolean;
  opacity?: number;
}

export const MetricExplorerSeriesChart = (props: Props) => {
  if (MetricsExplorerChartType.bar === props.type) {
    return <MetricsExplorerBarChart {...props} />;
  }
  return <MetricsExplorerAreaChart {...props} />;
};

export const MetricsExplorerAreaChart = ({ metric, id, series, type, stack, opacity }: Props) => {
  const color = (metric.color && colorTransformer(metric.color)) || colorTransformer(Color.color0);

  const yAccessors = Array.isArray(id)
    ? id.map((i) => getMetricId(metric, i)).slice(id.length - 1, id.length)
    : [getMetricId(metric, id)];
  const y0Accessors =
    Array.isArray(id) && id.length > 1
      ? id.map((i) => getMetricId(metric, i)).slice(0, 1)
      : undefined;
  const chartId = `series-${series.id}-${yAccessors.join('-')}`;

  const seriesAreaStyle: RecursivePartial<AreaSeriesStyle> = {
    line: {
      strokeWidth: 2,
      visible: true,
    },
    area: {
      opacity: opacity || 0.5,
      visible: type === MetricsExplorerChartType.area,
    },
  };

  return (
    <AreaSeries
      id={chartId}
      key={chartId}
      name={createMetricLabel(metric)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={yAccessors}
      y0Accessors={y0Accessors}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      areaSeriesStyle={seriesAreaStyle}
      color={color}
    />
  );
};

export const MetricsExplorerBarChart = ({ metric, id, series, stack }: Props) => {
  const color = (metric.color && colorTransformer(metric.color)) || colorTransformer(Color.color0);

  const yAccessors = Array.isArray(id)
    ? id.map((i) => getMetricId(metric, i)).slice(id.length - 1, id.length)
    : [getMetricId(metric, id)];
  const chartId = `series-${series.id}-${yAccessors.join('-')}`;

  const seriesBarStyle: RecursivePartial<BarSeriesStyle> = {
    rectBorder: {
      stroke: color,
      strokeWidth: 1,
      visible: true,
    },
    rect: {
      opacity: 1,
    },
  };
  return (
    <BarSeries
      id={chartId}
      key={chartId}
      name={createMetricLabel(metric)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={yAccessors}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      barSeriesStyle={seriesBarStyle}
      color={color}
    />
  );
};
