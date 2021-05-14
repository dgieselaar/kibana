/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { propsToSchema } from '@kbn/io-ts-utils/target/props_to_schema';
import * as t from 'io-ts';
import { configRt } from '../../../../../observability/common/rules/alerting_dsl/alerting_dsl_rt';
import {
  createExecutionPlan,
  getSteps,
  recordResults,
} from '../../../../../observability/server';
import {
  createLifecycleRuleTypeFactory,
  getRuleExecutorData,
} from '../../../../../rule_registry/server';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../../common/alert_types';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { RegisterRuleDependencies } from '../register_apm_alerts';

const BULK_LIMIT = 1000;

export function registerMetricRuleType({
  alerting,
  logger,
  ruleDataClient,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  const ruleTypeConfig = ALERT_TYPES_CONFIG[AlertType.Metric];

  const type = {
    ...ruleTypeConfig,
    id: AlertType.Metric,
  };

  alerting.registerType(
    createLifecycleRuleType({
      ...type,
      validate: {
        params: propsToSchema(
          t.type({
            config: configRt,
          })
        ),
      },
      executor: async (options) => {
        const {
          services: { scopedClusterClient, alertInstanceFactory },
          state,
        } = options;

        const { config } = options.params;

        const plan = createExecutionPlan({
          config,
          ruleDataClient,
          clusterClient: {
            search: async (request) => {
              const { body } = await scopedClusterClient.asCurrentUser.search(
                request
              );
              return body as any;
            },
          },
        });

        let processedUntil = isFiniteNumber(state.processedUntil)
          ? state.processedUntil
          : 0;

        const steps = getSteps({
          from: Math.max(
            processedUntil,
            options.previousStartedAt?.getTime() ?? 0
          ),
          to: options.startedAt.getTime(),
          max: 5,
          step: config.step,
        });

        if (!steps.length) {
          return {
            processedUntil,
          };
        }

        const ruleDataWriter = ruleDataClient.getWriter();

        try {
          for (const step of steps) {
            const results = await plan.evaluate({ time: step.time });
            await recordResults({
              defaults: getRuleExecutorData(type, options),
              results,
              ruleDataWriter,
            });

            processedUntil = step.time;
          }
        } catch (err) {
          logger.error(err);
        }

        return {
          processedUntil,
        };
      },
    })
  );
}
