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
  const sampleFields = [
    'event.action',
    'alert_instance.name',
    'alert_instance.title',
    'alert.severity.level',
    'alert.severity.value',
    'alert.reason',
    '@timestamp',
    'rule.id',
    'rule.name',
    'rule_type.id',
    'rule_type.name',
  ] as const;

  const fields = client.getFields();

  const response = await client.search({
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...kqlQuery(kuery),
            {
              terms: {
                'event.action': ['active-instance'],
              },
            },
          ],
        },
      },
      aggs: {
        alerts: {
          terms: {
            field: 'alert_instance.id',
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
        fields: (fields ?? []).reduce((prev, field) => {
          if ((latest as any)[field]?.[0]) {
            prev[field] = (latest as any)[field][0];
          }
          return prev;
        }, {} as Record<string, unknown>),
      };
    }) ?? []
  );
}
