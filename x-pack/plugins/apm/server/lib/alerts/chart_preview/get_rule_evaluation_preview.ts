/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { RuleDataWriter } from '../../../../../rule_registry/server';
import { ESSearchClient } from '../../../../../../../typings/elasticsearch';
import { AlertingConfig } from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { createExecutionPlan } from '../metric_rule_type/create_execution_plan';
import { getSteps } from '../metric_rule_type/get_steps';
import { recordResults } from '../metric_rule_type/record_results';
import { Measurement } from '../metric_rule_type/types';

function toSeries(measurements: Measurement[]) {
  const allSeries: Array<{
    labels: Record<string, string>;
    metricName: string;
    coordinates: Array<{ x: number; y?: unknown }>;
  }> = [];

  const times = [
    ...new Set(measurements.map((measurement) => measurement.time)),
  ];

  function getOrCreateSeries({
    labels,
    metricName,
  }: {
    labels: Record<string, string>;
    metricName: string;
  }) {
    let series = allSeries.find(
      (s) => isEqual(s.labels, labels) && s.metricName === metricName
    );

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
      series.coordinates.find((coord) => coord.x === measurement.time)!.y =
        metrics[metricName];
    });
  });

  return allSeries;
}

export async function getRuleEvaluationPreview({
  config,
  from,
  to,
  clusterClient,
  ruleDataWriter,
}: {
  config: AlertingConfig;
  from?: number;
  to: number;
  clusterClient: ESSearchClient;
  ruleDataWriter: RuleDataWriter;
}) {
  const plan = createExecutionPlan({
    config,
    clusterClient,
  });

  const steps =
    !config.step || !from
      ? [
          {
            time: to,
          },
        ]
      : getSteps({
          from,
          to,
          step: config.step,
          max: 20,
        });

  const evaluations: Measurement[] = [];

  for (const step of steps) {
    const results = await plan.evaluate({
      time: step.time,
    });

    await recordResults({
      defaults: {},
      results,
      ruleDataWriter,
    });

    evaluations.push(...results.evaluations);
  }

  const allSeries = toSeries(evaluations);

  return allSeries;
}
