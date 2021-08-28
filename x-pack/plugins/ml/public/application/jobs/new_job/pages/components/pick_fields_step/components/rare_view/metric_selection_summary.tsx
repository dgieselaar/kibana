/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import type { FC } from 'react';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import type { LineChartPoint } from '../../../../../common/chart_loader/chart_loader';
import { RareJobCreator } from '../../../../../common/job_creator/rare_job_creator';
import type { Anomaly, Results } from '../../../../../common/results_loader/results_loader';
import { EventRateChart } from '../../../charts/event_rate_chart/event_rate_chart';
import { JobCreatorContext } from '../../../job_creator_context';
import { DetectorDescription } from './detector_description';
import { RARE_DETECTOR_TYPE } from './rare_view';

const DTR_IDX = 0;

export const RareDetectorsSummary: FC = () => {
  const {
    jobCreator: jc,
    chartLoader,
    resultsLoader,
    chartInterval,
    jobCreatorUpdated,
  } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;

  const [loadingData, setLoadingData] = useState(false);
  const [anomalyData, setAnomalyData] = useState<Anomaly[]>([]);
  const [eventRateChartData, setEventRateChartData] = useState<LineChartPoint[]>([]);
  const [jobIsRunning, setJobIsRunning] = useState(false);

  const rareDetectorType = useMemo(() => {
    if (jobCreator.rareField !== null) {
      if (jobCreator.populationField === null) {
        return RARE_DETECTOR_TYPE.RARE;
      } else {
        return jobCreator.frequentlyRare
          ? RARE_DETECTOR_TYPE.FREQ_RARE_POPULATION
          : RARE_DETECTOR_TYPE.RARE_POPULATION;
      }
    } else {
      return RARE_DETECTOR_TYPE.RARE;
    }
  }, [jobCreatorUpdated]);

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
      <DetectorDescription detectorType={rareDetectorType} />
      <EuiSpacer size="s" />
      <EventRateChart
        eventRateChartData={eventRateChartData}
        anomalyData={anomalyData}
        height="300px"
        width="100%"
        showAxis={true}
        loading={loadingData}
        fadeChart={jobIsRunning}
      />
    </>
  );
};
