/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import { ESSearchClient } from '../../../../../../../typings/elasticsearch';
import { AlertingConfig } from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { createExecutionPlan } from '../metric_rule_type/create_execution_plan';
import { getSteps } from '../metric_rule_type/get_steps';

export function getRuleEvaluationPreview({
  config,
  from,
  to,
  clusterClient,
}: {
  config: AlertingConfig;
  from?: number;
  to: number;
  clusterClient: ESSearchClient;
}) {
  const plan = createExecutionPlan({
    config,
    clusterClient,
  });

  if (!config.step || !from) {
    return plan.evaluate({ time: to });
  }

  const steps = getSteps({
    from,
    to,
    step: config.step,
    max: 20,
  });

  const limiter = pLimit(5);

  return steps.map((step) =>
    limiter(() => {
      return plan.evaluate({
        time: step.time,
      });
    })
  );
}
