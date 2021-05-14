/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, flatten } from 'lodash';
import pLimit from 'p-limit';
import { RuleDataClient, RuleDataWriter } from '../../../../../rule_registry/server';
import { ESSearchClient } from '../../../../../../../typings/elasticsearch';
import { AlertingConfig } from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { createExecutionPlan } from './create_execution_plan';
import { getSteps } from './get_steps';
import { Measurement } from './types';

function toSeries(measurements: Measurement[]) {
  const allSeries: Array<{
    labels: Record<string, string>;
    metricName: string;
    coordinates: Array<{ x: number; y?: unknown }>;
  }> = [];

  const times = [...new Set(measurements.map((measurement) => measurement.time))];

  console.log({
    times,
  });

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
  const plan = createExecutionPlan({
    config,
    clusterClient,
    ruleDataClient,
  });

  const limiter = pLimit(5);

  const allEvaluations = flatten(
    await Promise.all(
      steps.map((step) => {
        return limiter(async () => {
          const { evaluations } = await plan.evaluate({
            time: step.time,
          });
          return evaluations;
        });
      })
    )
  );

  const allSeries = toSeries(allEvaluations);

  return allSeries;
}
