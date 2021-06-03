/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { RULE_UUID } from '@kbn/rule-data-utils/target/technical_field_names';
import pLimit from 'p-limit';
import { shouldWaitOnRecord } from '../../../../common/rules/alerting_dsl/utils';
import { isInstantVector } from '../../../../common/expressions/utils';
import { RuleDataClient } from '../../../../../rule_registry/server';
import { ESSearchClient } from '../../../../../../../typings/elasticsearch';
import { AlertingConfig } from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { createExecutionPlan } from './create_execution_plan';
import { recordResults } from './record_results';
import { MeasurementAlert } from './types';

interface Timeseries {
  labels: Record<string, any>;
  id: string;
  metricName: string;
  data: Array<{ x: number; y: number | null }>;
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

  const defaults = {
    [RULE_UUID]: ruleUuid,
  };

  const ruleDataWriter = ruleDataClient.getWriter();

  const timeseries: Record<string, Record<string, Timeseries>> = {};
  const alerts: MeasurementAlert[] = [];

  const wait = shouldWaitOnRecord(config);

  const operations = steps.map((step) => {
    return async () => {
      const results = await plan.evaluate({ time: step.time });
      await recordResults({
        defaults,
        results,
        ruleDataWriter,
        refresh: wait ? 'wait_for' : false,
      });

      console.log(JSON.stringify(results, null, 2));

      alerts.push(...results.alerts);
      // eslint-disable-next-line guard-for-in
      for (const key in results.evaluations) {
        const result = results.evaluations[key];
        if (isInstantVector(result)) {
          result.samples.forEach((sample) => {
            const id = sample.labels.sig();
            let series = timeseries[id]?.[key];
            if (!series) {
              series = { data: [], metricName: key, id, labels: sample.labels.record };
              if (!timeseries[id]) {
                timeseries[id] = {};
              }
              timeseries[id][key] = series;
            }
            series.data.push({ x: result.time, y: sample.value });
          });
        }
      }
    };
  });

  if (wait) {
    await operations.reduce(async (prev, op) => {
      await prev;
      return op();
    }, Promise.resolve());
  } else {
    const limiter = pLimit(5);
    await Promise.all(operations.map((op) => limiter(op)));
  }

  const evaluations: Timeseries[] = [
    ...Object.values(timeseries).flatMap((map) => Object.values(map)),
  ];

  return {
    evaluations,
    alerts,
  };
}
