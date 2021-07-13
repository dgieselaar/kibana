/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { propsToSchema } from '@kbn/io-ts-utils/target/props_to_schema';
import * as t from 'io-ts';
import stableStringify from 'json-stable-stringify';
import { set } from '@elastic/safer-lodash-set';
import { RULE_UUID } from '@kbn/rule-data-utils/target/technical_field_names';
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

export const unflattenObject = <T extends object = { [key: string]: any }>(
  object: object
): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);

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
          services: { scopedClusterClient, alertWithLifecycle },
          state,
        } = options;

        const { config } = options.params;

        const ruleData = getRuleExecutorData(type, options);

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
          ruleUuid: ruleData[RULE_UUID],
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

        const scheduled = new Set<string>();

        try {
          for (const step of steps) {
            const results = await plan.evaluate({ time: step.time });

            await recordResults({
              defaults: ruleData,
              results,
              ruleDataWriter,
              refresh: steps.length > 1 ? 'wait_for' : false,
            });

            processedUntil = step.time;

            const alerts = results.alerts;

            alerts.forEach((alert) => {
              const context = unflattenObject({
                ...alert.context,
                ...alert.labels.record,
              });

              const id = alert.labels.sig();

              if (scheduled.has(id)) {
                return;
              }

              scheduled.add(id);

              const alertInstance = alertWithLifecycle({
                id,
                fields: context,
              });

              alertInstance.scheduleActions(
                alert.actionGroupId ?? ruleTypeConfig.defaultActionGroupId,
                context
              );
            });
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
