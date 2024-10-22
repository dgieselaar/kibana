/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OutputEvent, OutputEventType, OutputUpdateEvent } from '.';

export function isOutputUpdateEvent<TId extends string>(
  event: OutputEvent
): event is OutputUpdateEvent<TId> {
  return event.type === OutputEventType.OutputUpdate;
}
