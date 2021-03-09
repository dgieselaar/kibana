/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

// provides TypeScript and config-schema interfaces for ECS for use with
// the event log

import { schema, TypeOf } from '@kbn/config-schema';

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>> : DeepPartial<T[P]>;
};

export const ECS_VERSION = '1.8.0';

// types and config-schema describing the es structures
export type IValidatedEvent = TypeOf<typeof EventSchema>;
export type IEvent = DeepPartial<DeepWriteable<IValidatedEvent>>;

export const EventSchema = schema.maybe(
  schema.object({
    '@timestamp': ecsDate(),
    tags: ecsStringMulti(),
    message: ecsString(),
    ecs: schema.maybe(
      schema.object({
        version: ecsString(),
      }, { unknowns: 'allow' })
    ),
    event: schema.maybe(
      schema.object({
        action: ecsString(),
        provider: ecsString(),
        start: ecsDate(),
        duration: ecsNumber(),
        end: ecsDate(),
        outcome: ecsString(),
        reason: ecsString(),
        kind: ecsString(),
      }, { unknowns: 'allow' })
    ),
    error: schema.maybe(
      schema.object({
        message: ecsString(),
      }, { unknowns: 'allow' })
    ),
    user: schema.maybe(
      schema.object({
        name: ecsString(),
      }, { unknowns: 'allow' })
    ),
    kibana: schema.maybe(
      schema.object({
        server_uuid: ecsString(),
        alerting: schema.maybe(
          schema.object({
            instance_id: ecsString(),
            action_group_id: ecsString(),
            action_subgroup: ecsString(),
            status: ecsString(),
          }, { unknowns: 'allow' })
        ),
        saved_objects: schema.maybe(
          schema.arrayOf(
            schema.object({
              rel: ecsString(),
              namespace: ecsString(),
              id: ecsString(),
              type: ecsString(),
            }, { unknowns: 'allow' })
          )
        ),
      }, { unknowns: 'allow' })
    ),
    alert_instance: schema.maybe(
      schema.object({
        id: ecsString(),
        uuid: ecsString(),
        title: ecsString(),
        name: ecsString(),
        started_at: ecsDate(),
      }, { unknowns: 'allow' })
    ),
    alert: schema.maybe(
      schema.object({
        severity: schema.maybe(
          schema.object({
            level: ecsString(),
            value: ecsNumber(),
            threshold: ecsNumber(),
          }, { unknowns: 'allow' })
        ),
        reason: ecsString(),
        influencers: ecsStringMulti(),
      }, { unknowns: 'allow' })
    ),
    rule: schema.maybe(
      schema.object({
        id: ecsString(),
        name: ecsString(),
        executor: schema.maybe(
          schema.object({
            next_update_at: ecsDate(),
          }, { unknowns: 'allow' })
        ),
      }, { unknowns: 'allow' })
    ),
    rule_type: schema.maybe(
      schema.object({
        id: ecsString(),
        name: ecsString(),
        description: ecsString(),
      }, { unknowns: 'allow' })
    ),
  }, { unknowns: 'allow' })
);

function ecsStringMulti() {
  return schema.maybe(schema.arrayOf(schema.string()));
}

function ecsString() {
  return schema.maybe(schema.string());
}

function ecsNumber() {
  return schema.maybe(schema.number());
}

function ecsDate() {
  return schema.maybe(schema.string({ validate: validateDate }));
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function validateDate(isoDate: string) {
  if (ISO_DATE_PATTERN.test(isoDate)) return;
  return 'string is not a valid ISO date: ' + isoDate;
}
