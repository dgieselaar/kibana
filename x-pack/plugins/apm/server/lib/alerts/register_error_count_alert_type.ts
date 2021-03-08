/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { isEmpty } from 'lodash';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../common/environment_filter_values';
import { APMConfig } from '../..';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeState,
} from '../../../../alerts/server';
import {
  AlertType,
  ALERT_TYPES_CONFIG,
  ThresholdMetActionGroupId,
} from '../../../common/alert_types';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../server/utils/queries';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';
import { alertingEsClient } from './alerting_es_client';
import { ObservabilityAlertRegistry } from '../../../../observability/server';

interface RegisterAlertParams {
  alerts: ObservabilityAlertRegistry;
  config$: Observable<APMConfig>;
}

const paramsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.ErrorCount];

export function registerErrorCountAlertType({
  alerts,
  config$,
}: RegisterAlertParams) {
  alerts.registerType<
    TypeOf<typeof paramsSchema>,
    AlertTypeState,
    AlertInstanceState,
    AlertInstanceContext,
    ThresholdMetActionGroupId
  >({
    id: AlertType.ErrorCount,
    name: alertTypeConfig.name,
    actionGroups: alertTypeConfig.actionGroups,
    defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
    validate: {
      params: paramsSchema,
    },
    actionVariables: {
      context: [
        apmActionVariables.serviceName,
        apmActionVariables.environment,
        apmActionVariables.threshold,
        apmActionVariables.triggerValue,
        apmActionVariables.interval,
      ],
    },
    producer: 'apm',
    minimumLicenseRequired: 'basic',
    executor: async ({ services, params }) => {
      const config = await config$.pipe(take(1)).toPromise();
      const alertParams = params;
      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient,
      });
      const maxServiceEnvironments = config['xpack.apm.maxServiceEnvironments'];

      const searchParams = {
        index: indices['apm_oss.errorIndices'],
        size: 0,
        body: {
          track_total_hits: true,
          query: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: `now-${alertParams.windowSize}${alertParams.windowUnit}`,
                    },
                  },
                },
                { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
                ...(alertParams.serviceName
                  ? [{ term: { [SERVICE_NAME]: alertParams.serviceName } }]
                  : []),
                ...environmentQuery(alertParams.environment),
              ],
            },
          },
          aggs: {
            services: {
              terms: {
                field: SERVICE_NAME,
                size: 50,
              },
              aggs: {
                environments: {
                  terms: {
                    field: SERVICE_ENVIRONMENT,
                    size: maxServiceEnvironments,
                  },
                },
              },
            },
          },
        },
      };

      const response = await alertingEsClient(services, searchParams);
      const errorCount = response.hits.total.value;

      if (errorCount > alertParams.threshold) {
        function scheduleAction({
          serviceName,
          environment,
        }: {
          serviceName: string;
          environment?: string;
        }) {
          const alertInstanceName = [serviceName, environment]
            .filter((name) => name)
            .join('_');

          const alertInstance = services.alertInstanceFactory(
            alertInstanceName
          );
          alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId, {
            serviceName,
            environment,
            threshold: alertParams.threshold,
            triggerValue: errorCount,
            interval: `${alertParams.windowSize}${alertParams.windowUnit}`,
          });
        }
        response.aggregations?.services.buckets.forEach((serviceBucket) => {
          const serviceName = serviceBucket.key as string;
          if (isEmpty(serviceBucket.environments?.buckets)) {
            scheduleAction({ serviceName });
          } else {
            serviceBucket.environments.buckets.forEach((envBucket) => {
              const environment = envBucket.key as string;
              scheduleAction({ serviceName, environment });
            });
          }
        });
      }
    },
    mappings: {
      properties: {
        processor: {
          properties: {
            event: {
              type: 'keyword',
            },
          },
        },
        service: {
          properties: {
            name: {
              type: 'keyword',
            },
            environment: {
              type: 'keyword',
            },
          },
        },
        transaction: {
          properties: {
            name: {
              type: 'keyword',
            },
          },
        },
      },
    },
    mapAlertParamsToEvent: (params) => {
      const event: Record<string, any> = {
        processor: {
          event: 'error',
        },
      };

      event.service = {};

      if (params.serviceName) {
        event.service.name = params.serviceName;
      }

      if (
        params.environment &&
        params.environment !== ENVIRONMENT_NOT_DEFINED.value &&
        params.environment !== ENVIRONMENT_ALL.value
      ) {
        event.service.environment = params.environment;
      }

      return event;
    },
    mapAlertInstanceToEvent: ({ context }) => {
      if (!context) {
        return {};
      }

      const { serviceName, environment, triggerValue, threshold } =
        context ?? {};

      const event = {
        service: {
          name: serviceName,
          environment: !(
            environment === ENVIRONMENT_NOT_DEFINED.value ||
            environment === ENVIRONMENT_ALL.value
          )
            ? environment
            : undefined,
        },
        alert_instance: {
          title: `${serviceName}:${environment}`,
        },
        alert: {
          severity: {
            value: triggerValue as number,
            threshold: threshold as number,
          },
          reason: `Error count for ${serviceName} in ${environment} was above the threshold of ${threshold} (${triggerValue})`,
        },
      };

      return event;
    },
  });
}
