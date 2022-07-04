/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYBrushEvent } from '@elastic/charts';
import { EuiSpacer } from '@elastic/eui';
import React from 'react';

import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

import type { TabContentProps } from '../types';

import { ProcessorEvent } from '../../../../../common/processor_event';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { DurationDistributionChartWithScrubber } from '../../../shared/charts/duration_distribution_chart_with_scrubber';
import { HeightRetainer } from '../../../shared/height_retainer';
import { useTransactionDistributionChartData } from '../distribution/use_transaction_distribution_chart_data';
import { CriticalPathChart } from '../../../shared/charts/critical_path_chart';

interface TransactionCriticalPathProps {
  onChartSelection: (event: XYBrushEvent) => void;
  onClearSelection: () => void;
  selection?: [number, number];
  traceSamples: TabContentProps['traceSamples'];
  traceSamplesStatus: FETCH_STATUS;
}

export function TransactionCriticalPath({
  onChartSelection,
  onClearSelection,
  selection,
  traceSamples,
  traceSamplesStatus,
}: TransactionCriticalPathProps) {
  const { urlParams } = useLegacyUrlParams();

  const {
    query: { 
      rangeFrom, 
      rangeTo,
      flyoutItemId,
    },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const { serviceName } = useApmServiceContext();
  const transactionName = urlParams.transactionName;
  const traceIds = traceSamples.map((sample) => sample.traceId);

  const { chartData, hasData, percentileThresholdValue, status } =
    useTransactionDistributionChartData();

  return (
    <HeightRetainer>
      <div data-test-subj="apmCriticalPathTabContent">
        <DurationDistributionChartWithScrubber
          onChartSelection={onChartSelection}
          onClearSelection={onClearSelection}
          selection={selection}
          status={status}
          chartData={chartData}
          hasData={hasData}
          percentileThresholdValue={percentileThresholdValue}
          eventType={ProcessorEvent.transaction}
        />
        <EuiSpacer size="s" />
        <CriticalPathChart
          traceIds={traceIds}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          flyoutItemId={flyoutItemId ?? ''}
          isLoading={traceSamplesStatus === FETCH_STATUS.LOADING}
          serviceName={serviceName}
          transactionName={transactionName}
        />
      </div>
    </HeightRetainer>
  );
}
