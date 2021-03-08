/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

exports.EcsExtensionsMappings = {
  properties: {
    kibana: {
      properties: {
        // kibana server uuid
        server_uuid: {
          type: 'keyword',
          ignore_above: 1024,
        },
        // alerting specific fields
        alerting: {
          properties: {
            instance_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            action_group_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            action_subgroup: {
              type: 'keyword',
              ignore_above: 1024,
            },
            status: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        // array of saved object references, for "linking" via search
        saved_objects: {
          type: 'nested',
          properties: {
            // relation; currently only supports "primary" or not set
            rel: {
              type: 'keyword',
              ignore_above: 1024,
            },
            // relevant kibana space
            namespace: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
      },
    },
    alert_instance: {
      properties: {
        id: {
          type: 'keyword',
        },
        uuid: {
          type: 'keyword',
        },
        name: {
          type: 'keyword',
        },
        title: {
          type: 'keyword',
        },
        started_at: {
          type: 'date',
        },
      },
    },
    alert: {
      properties: {
        severity: {
          properties: {
            level: {
              type: 'keyword',
            },
            value: {
              type: 'float',
            },
            threshold: {
              type: 'float',
            },
          },
        },
        reason: {
          type: 'keyword',
        },
      },
    },
    rule: {
      properties: {
        id: {
          type: 'keyword',
        },
        name: {
          type: 'keyword',
        },
        executor: {
          properties: {
            next_update_at: {
              type: 'date',
            },
          },
        },
      },
    },
    rule_type: {
      properties: {
        id: {
          type: 'keyword',
        },
        name: {
          type: 'keyword',
        },
        description: {
          type: 'text',
        },
        producer: {
          type: 'keyword',
        },
      },
    },
  },
};

// ECS and Kibana ECS extension properties to generate
exports.EcsEventLogProperties = [
  '@timestamp',
  'tags',
  'message',
  'ecs.version',
  'event.action',
  'event.provider',
  'event.start',
  'event.duration',
  'event.end',
  'event.outcome', // optional, but one of failure, success, unknown
  'event.reason',
  'event.kind',
  'error.message',
  'user.name',
  'kibana.server_uuid',
  'kibana.alerting.instance_id',
  'kibana.alerting.action_group_id',
  'kibana.alerting.action_subgroup',
  'kibana.alerting.status',
  'kibana.saved_objects.rel',
  'kibana.saved_objects.namespace',
  'kibana.saved_objects.id',
  'kibana.saved_objects.name',
  'kibana.saved_objects.type',
  'alert_instance.id',
  'alert_instance.uuid',
  'alert_instance.title',
  'alert_instance.name',
  'alert_instance.started_at',
  'alert.reason',
  'alert.severity.level',
  'alert.severity.value',
  'alert.severity.threshold',
  'rule.id',
  'rule.name',
  'rule.executor.next_update_at',
  'rule_type.id',
  'rule_type.name',
  'rule_type.description',
];

// properties that can have multiple values (array vs single value)
exports.EcsEventLogMultiValuedProperties = ['tags'];
