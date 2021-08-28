/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import type { LineChartPoint } from '../../../../../common/chart_loader/chart_loader';
import { CategorizationJobCreator } from '../../../../../common/job_creator/categorization_job_creator';
import type { Anomaly, Results } from '../../../../../common/results_loader/results_loader';
import { EventRateChart } from '../../../charts/event_rate_chart/event_rate_chart';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategoryStoppedPartitions } from './category_stopped_partitions';
import { TopCategories } from './top_categories';

const DTR_IDX = 0;

export const CategorizationDetectorsSummary: FC = () => {
  const { jobCreator: jc, chartLoader, resultsLoader, chartInterval } = useContext(
    JobCreatorContext
  );
  const jobCreator = jc as CategorizationJobCreator;

  const [loadingData, setLoadingData] = useState(false);
  const [anomalyData, setAnomalyData] = useState<Anomaly[]>([]);
  const [eventRateChartData, setEventRateChartData] = useState<LineChartPoint[]>([]);
  const [jobIsRunning, setJobIsRunning] = useState(false);

  function setResultsWrapper(results: Results) {
    const anomalies = results.anomalies[DTR_IDX];
    if (anomalies !== undefined) {
      setAnomalyData(anomalies);
    }
  }

  function watchProgress(progress: number) {
    setJobIsRunning(progress > 0);
  }

  useEffect(() => {
    // subscribe to progress and results
    const resultsSubscription = resultsLoader.subscribeToResults(setResultsWrapper);
    jobCreator.subscribeToProgress(watchProgress);
    loadChart();
    return () => {
      resultsSubscription.unsubscribe();
    };
  }, []);

  async function loadChart() {
    setLoadingData(true);
    try {
      const resp = await chartLoader.loadEventRateChart(
        jobCreator.start,
        jobCreator.end,
        chartInterval.getInterval().asMilliseconds(),
        jobCreator.runtimeMappings ?? undefined,
        jobCreator.datafeedConfig.indices_options
      );
      setEventRateChartData(resp);
    } catch (error) {
      setEventRateChartData([]);
    }
    setLoadingData(false);
  }

  return (
    <>
      <EventRateChart
        eventRateChartData={eventRateChartData}
        anomalyData={anomalyData}
        height="300px"
        width="100%"
        showAxis={true}
        loading={loadingData}
        fadeChart={jobIsRunning}
      />
      <TopCategories />
      <CategoryStoppedPartitions />
    </>
  );
};
