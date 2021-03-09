/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Maybe } from '../../../typings/common';
import { AlertSeverity } from '../../../../alerts/common';
import { AlertHistoryClient } from '../../../../observability/server';
import { kqlQuery, rangeQuery } from '../../utils/queries';

export async function getTopAlerts({
  client,
  start,
  end,
  kuery,
}: {
  client: AlertHistoryClient;
  start: number;
  end: number;
  kuery?: string;
}) {
  const groupByField = 'alert_instance.uuid' as const;

  const sampleFields = [
    'event.action',
    'alert_instance.name',
    'alert_instance.title',
    'alert.severity.level',
    'alert.severity.value',
    'alert.reason',
    'alert.influencers',
    '@timestamp',
    'rule.id',
    'rule.name',
    'rule_type.id',
    'rule_type.name',
    groupByField,
  ] as const;

  const fields = client.getFields();

  const sharedFilters = [...rangeQuery(start, end), ...kqlQuery(kuery)];

  async function getActiveInstances() {
    const response = await client.search({
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...sharedFilters,
              {
                term: {
                  'event.action': 'active-instance',
                },
              },
            ],
          },
        },
        aggs: {
          alerts: {
            terms: {
              field: groupByField,
              size: 1000,
              order: {
                last_triggered: 'desc',
              },
            },
            aggs: {
              first_triggered: {
                min: {
                  field: '@timestamp',
                },
              },
              last_triggered: {
                max: {
                  field: '@timestamp',
                },
              },
              latest: {
                top_hits: {
                  fields: sampleFields.concat(fields as any[]),
                  size: 1,
                  _source: false,
                  sort: {
                    '@timestamp': 'desc',
                  },
                },
              },
              unique_instances: {
                cardinality: {
                  field: 'alert_instance.uuid',
                },
              },
              timeseries: {
                auto_date_histogram: {
                  buckets: 10,
                  field: '@timestamp',
                },
                aggs: {
                  severity: {
                    max: {
                      field: 'alert.severity.value',
                    },
                  },
                  threshold: {
                    max: {
                      field: 'alert.severity.threshold',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const { aggregations } = response;

    return (
      aggregations?.alerts.buckets.map((bucket) => {
        const latest = bucket.latest.hits.hits[0].fields;

        return {
          timestamp: bucket.last_triggered.value!,
          first_seen: bucket.first_triggered.value!,
          severity_level: latest['alert.severity.level']![0] as AlertSeverity,
          severity_value: latest['alert.severity.value']![0] as number,
          reason: latest['alert.reason']![0] as string,
          rule_id: latest['rule.id']![0] as string,
          rule_name: latest['rule.name']![0] as string,
          rule_type_id: latest['rule_type.id']![0] as string,
          rule_type_name: latest['rule_type.name']![0] as string,
          alert_instance_title: latest['alert_instance.title'] as Maybe<string>,
          alert_instance_name: latest['alert_instance.name']![0] as string,
          unique: bucket.unique_instances.value,
          group_by_field: groupByField,
          group_by_value: latest[groupByField]![0] as string,
          influencers: (latest['alert.influencers'] as Maybe<string[]>) ?? [],
          fields: (fields ?? []).reduce((prev, field) => {
            if ((latest as any)[field]?.[0]) {
              prev[field] = (latest as any)[field][0];
            }
            return prev;
          }, {} as Record<string, unknown>),
          timeseries: bucket.timeseries.buckets.map((dateBucket) => ({
            x: dateBucket.key,
            y: dateBucket.severity.value,
            threshold: dateBucket.threshold.value,
          })),
        };
      }) ?? []
    );
  }

  async function getRecoveredInstances() {
    const response = await client.search({
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...sharedFilters,
              { term: { 'event.action': 'recovered-instance' } },
            ],
          },
        },
        aggs: {
          resolved_alerts: {
            terms: {
              field: groupByField,
              size: 1000,
              order: {
                last_triggered: 'desc',
              },
            },
            aggs: {
              last_triggered: {
                max: {
                  field: '@timestamp',
                },
              },
            },
          },
        },
      },
    });

    return (
      response.aggregations?.resolved_alerts.buckets.map(
        (bucket) => bucket.key as string
      ) ?? []
    );
  }

  const [activeInstances, recoveredInstances] = await Promise.all([
    getActiveInstances(),
    getRecoveredInstances(),
  ]);

  const instances = activeInstances.map((instance) => {
    return {
      ...instance,
      recovered: recoveredInstances.includes(instance.group_by_value),
    };
  });

  return instances;
}
