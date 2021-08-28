/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import type { FC } from 'react';
import React, { Fragment } from 'react';
import { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';
import type { AggFieldPair, SplitField } from '../../../../../../../../../common/types/fields';
import type { LineChartData } from '../../../../../common/chart_loader/chart_loader';
import type { Anomaly, ModelItem } from '../../../../../common/results_loader/results_loader';
import { AnomalyChart, CHART_TYPE } from '../../../charts/anomaly_chart/anomaly_chart';
import type { ChartSettings } from '../../../charts/common/settings';
import { DetectorTitle } from '../detector_title/detector_title';
import { useAnimateSplit } from '../split_cards/animate_split_hook';
import { SplitCards } from '../split_cards/split_cards';

interface ChartGridProps {
  aggFieldPairList: AggFieldPair[];
  chartSettings: ChartSettings;
  splitField: SplitField;
  fieldValues: string[];
  lineChartsData: LineChartData;
  modelData: Record<number, ModelItem[]>;
  anomalyData: Record<number, Anomaly[]>;
  deleteDetector?: (index: number) => void;
  jobType: JOB_TYPE;
  animate?: boolean;
  loading?: boolean;
}

export const ChartGrid: FC<ChartGridProps> = ({
  aggFieldPairList,
  chartSettings,
  splitField,
  fieldValues,
  lineChartsData,
  modelData,
  anomalyData,
  deleteDetector,
  jobType,
  loading = false,
}) => {
  const animateSplit = useAnimateSplit();

  return (
    <SplitCards
      fieldValues={fieldValues}
      splitField={splitField}
      numberOfDetectors={aggFieldPairList.length}
      jobType={jobType}
      animate={animateSplit}
    >
      <EuiFlexGrid columns={chartSettings.cols}>
        {aggFieldPairList.map((af, i) => (
          <EuiFlexItem key={i} data-test-subj={`mlDetector ${i}`}>
            <Fragment>
              <DetectorTitle
                index={i}
                agg={aggFieldPairList[i].agg}
                field={aggFieldPairList[i].field}
                deleteDetector={deleteDetector}
              />
              <AnomalyChart
                chartType={CHART_TYPE.LINE}
                chartData={lineChartsData[i]}
                modelData={modelData[i]}
                anomalyData={anomalyData[i]}
                height={chartSettings.height}
                width={chartSettings.width}
                loading={loading}
              />
            </Fragment>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </SplitCards>
  );
};
