/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { DateFromString } from './date_from_string';

const metaSchema = t.intersection([
  t.partial({
    lastScheduledActions: t.intersection([
      t.partial({
        subgroup: t.string,
      }),
      t.type({
        group: t.string,
        date: DateFromString,
      }),
    ]),
  }),
  t.type({
    instance: t.intersection([
      t.type({
        uuid: t.string, // unique identifier for this instance
        id: t.string, // rule_id + name
        name: t.string, // unique identifier within the context of rule
        started_at: DateFromString, // start date for this instance
      }),
      t.partial({
        title: t.string, // human-readable label
      }),
    ]),
  }),
]);
export type AlertInstanceMeta = t.TypeOf<typeof metaSchema>;

const stateSchema = t.record(t.string, t.unknown);
export type AlertInstanceState = t.TypeOf<typeof stateSchema>;

const contextSchema = t.record(t.string, t.unknown);
export type AlertInstanceContext = t.TypeOf<typeof contextSchema>;

export const rawAlertInstance = t.intersection([
  t.partial({
    state: stateSchema,
  }),
  t.type({
    meta: metaSchema,
  }),
]);

export type RawAlertInstance = t.TypeOf<typeof rawAlertInstance>;
