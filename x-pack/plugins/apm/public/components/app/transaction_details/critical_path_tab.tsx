/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import type { TabContentProps } from './types';
import { TransactionCriticalPath } from './critical_path';

function CriticalPathTab({
  selectSampleFromChartSelection,
  clearChartSelection,
  sampleRangeFrom,
  sampleRangeTo,
  traceSamples,
  traceSamplesStatus,
}: TabContentProps) {
  return (
    <TransactionCriticalPath
      onChartSelection={selectSampleFromChartSelection}
      onClearSelection={clearChartSelection}
      selection={
        sampleRangeFrom !== undefined && sampleRangeTo !== undefined
          ? [sampleRangeFrom, sampleRangeTo]
          : undefined
      }
      traceSamplesStatus={traceSamplesStatus}
      traceSamples={traceSamples}
    />
  );
}

export const criticalPathTab = {
  dataTestSubj: 'apmCriticalPathTabButton',
  key: 'criticalPath',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.criticalPathLabel', {
    defaultMessage: 'Aggregated Critical Path',
  }),
  component: CriticalPathTab,
};
