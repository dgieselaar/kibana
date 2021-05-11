/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import { RuleDataWriter } from '../../../../../rule_registry/server';
import { ESSearchClient } from '../../../../../../../typings/elasticsearch';
import { AlertingConfig } from '../../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { createExecutionPlan } from '../metric_rule_type/create_execution_plan';
import { getSteps } from '../metric_rule_type/get_steps';
import { recordResults } from '../metric_rule_type/record_results';

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

  if (!config.step || !from) {
    const results = await plan.evaluate({ time: to });
    return [results];
  }

  const steps = getSteps({
    from,
    to,
    step: config.step,
    max: 20,
  });

  const limiter = pLimit(5);

  return Promise.all(
    steps.map((step) =>
      limiter(async () => {
        const results = await plan.evaluate({
          time: step.time,
        });
        await recordResults({
          defaults: {},
          results,
          ruleDataWriter,
        });
        return results;
      })
    )
  );
}
