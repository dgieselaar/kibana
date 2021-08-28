/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React from 'react';
import type { TimefilterContract } from '../../../../../../../src/plugins/data/public/query/timefilter/timefilter';
import type { MlLocator } from '../../../../common/types/locator';
import type { EntityFieldOperation } from '../../../../common/util/anomaly_utils';
import type { TableSeverity } from '../../components/controls/select_severity/select_severity';
import { SelectSeverityUI } from '../../components/controls/select_severity/select_severity';
import { TimeBuckets } from '../../util/time_buckets';
// @ts-ignore
import { ExplorerChartsContainer } from './explorer_charts_container';
import type { ExplorerChartsData } from './explorer_charts_container_service';



interface ExplorerAnomaliesContainerProps {
  id: string;
  chartsData: ExplorerChartsData;
  showCharts: boolean;
  severity: TableSeverity;
  setSeverity: (severity: TableSeverity) => void;
  mlLocator: MlLocator;
  timeBuckets: TimeBuckets;
  timefilter: TimefilterContract;
  onSelectEntity: (fieldName: string, fieldValue: string, operation: EntityFieldOperation) => void;
  showSelectedInterval?: boolean;
}

const tooManyBucketsCalloutMsg = i18n.translate(
  'xpack.ml.explorer.charts.dashboardTooManyBucketsDescription',
  {
    defaultMessage:
      'This selection contains too many buckets to be displayed. You should shorten the time range of the view.',
  }
);

export const ExplorerAnomaliesContainer: FC<ExplorerAnomaliesContainerProps> = ({
  id,
  chartsData,
  showCharts,
  severity,
  setSeverity,
  mlLocator,
  timeBuckets,
  timefilter,
  onSelectEntity,
  showSelectedInterval,
}) => {
  return (
    <>
      <EuiFlexGroup id={id} direction="row" gutterSize="l" responsive={true}>
        <EuiFlexItem grow={false}>
          <SelectSeverityUI severity={severity} onChange={setSeverity} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      {Array.isArray(chartsData.seriesToPlot) &&
        chartsData.seriesToPlot.length === 0 &&
        chartsData.errorMessages === undefined && (
          <EuiText textAlign={'center'} data-test-subj={'mlNoMatchingAnomaliesMessage'}>
            <h4>
              <FormattedMessage
                id="xpack.ml.explorer.noMatchingAnomaliesFoundTitle"
                defaultMessage="No matching anomalies found"
              />
            </h4>
          </EuiText>
        )}
      <div className="euiText explorer-charts">
        {showCharts && (
          <ExplorerChartsContainer
            {...{
              ...chartsData,
              severity: severity.val,
              mlLocator,
              timeBuckets,
              timefilter,
              onSelectEntity,
              tooManyBucketsCalloutMsg,
              showSelectedInterval,
            }}
          />
        )}
      </div>
    </>
  );
};
