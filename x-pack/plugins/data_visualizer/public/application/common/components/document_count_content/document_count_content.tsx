/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import type {
  FieldVisConfig,
  FileBasedFieldVisConfig,
} from '../stats_table/types/field_vis_config';
import type { DocumentCountChartPoint } from './document_count_chart/document_count_chart';
import { DocumentCountChart } from './document_count_chart/document_count_chart';
import { TotalCountHeader } from './total_count_header';

export interface Props {
  config?: FieldVisConfig | FileBasedFieldVisConfig;
  totalCount: number;
}

export const DocumentCountContent: FC<Props> = ({ config, totalCount }) => {
  if (config?.stats === undefined) {
    return totalCount !== undefined ? <TotalCountHeader totalCount={totalCount} /> : null;
  }

  const { documentCounts, timeRangeEarliest, timeRangeLatest } = config.stats;
  if (
    documentCounts === undefined ||
    timeRangeEarliest === undefined ||
    timeRangeLatest === undefined
  )
    return null;

  let chartPoints: DocumentCountChartPoint[] = [];
  if (documentCounts.buckets !== undefined) {
    const buckets: Record<string, number> = documentCounts?.buckets;
    chartPoints = Object.entries(buckets).map(([time, value]) => ({ time: +time, value }));
  }

  return (
    <>
      <TotalCountHeader totalCount={totalCount} />
      <DocumentCountChart
        chartPoints={chartPoints}
        timeRangeEarliest={timeRangeEarliest}
        timeRangeLatest={timeRangeLatest}
        interval={documentCounts.interval}
      />
    </>
  );
};
