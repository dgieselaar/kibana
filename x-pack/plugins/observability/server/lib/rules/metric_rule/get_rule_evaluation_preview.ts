/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import uuid from 'uuid';
import { RULE_UUID } from '@kbn/rule-data-utils/target/technical_field_names';
import { RuleDataClient } from '../../../../../rule_registry/server';
import { ESSearchClient } from '../../../../../../../typings/elasticsearch';
import { AlertingConfig } from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { createExecutionPlan } from './create_execution_plan';
import { Measurement, MeasurementAlert } from './types';
import { recordResults } from './record_results';

function toSeries(measurements: Measurement[]) {
  const allSeries: Array<{
    labels: Record<string, string>;
    metricName: string;
    coordinates: Array<{ x: number; y?: unknown }>;
  }> = [];

  const times = [...new Set(measurements.map((measurement) => measurement.time))];

  function getOrCreateSeries({
    labels,
    metricName,
  }: {
    labels: Record<string, string>;
    metricName: string;
  }) {
    let series = allSeries.find((s) => isEqual(s.labels, labels) && s.metricName === metricName);

    if (!series) {
      series = {
        labels,
        metricName,
        coordinates: times.map((time) => {
          return {
            x: time,
            y: null,
          };
        }),
      };
      allSeries.push(series);
    }
    return series;
  }

  measurements.forEach((measurement) => {
    const labels = measurement.labels;
    const metrics = measurement.metrics;
    Object.keys(measurement.metrics).forEach((metricName) => {
      const series = getOrCreateSeries({ labels, metricName });
      series.coordinates.find((coord) => coord.x === measurement.time)!.y = metrics[metricName];
    });
  });

  return allSeries;
}

export async function getRuleEvaluationPreview({
  config,
  steps,
  clusterClient,
  ruleDataClient,
}: {
  config: AlertingConfig;
  steps: Array<{ time: number }>;
  clusterClient: ESSearchClient;
  ruleDataClient: RuleDataClient;
}) {
  const ruleUuid = uuid.v4();

  const plan = createExecutionPlan({
    config,
    clusterClient,
    ruleDataClient,
    ruleUuid,
  });

  // const limiter = pLimit(5);

  const allResults: Array<{
    evaluations: Measurement[];
    alerts: MeasurementAlert[];
    record: Record<string, { type: string }>;
  }> = [];

  const defaults = {
    [RULE_UUID]: ruleUuid,
  };

  const ruleDataWriter = ruleDataClient.getWriter();

  for (const step of steps) {
    const results = await plan.evaluate({ time: step.time });
    await recordResults({
      defaults,
      results,
      ruleDataWriter,
      refresh: 'wait_for',
    });

    allResults.push(results);
  }

  const allEvaluations = allResults.flatMap((result) => result.evaluations);
  const allAlerts = allResults.flatMap((result) => result.alerts);

  return {
    evaluations: toSeries(allEvaluations),
    alerts: allAlerts,
  };
}
