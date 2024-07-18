/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, OperatorFunction } from 'rxjs';
import { InferenceTaskEvent } from '../../common';
import { InferenceTaskEventType, InferenceTaskUpdateEvent } from '../../common/tasks';

export function onlyTaskCompleteEvents<TTaskEvent extends InferenceTaskEvent>(): OperatorFunction<
  TTaskEvent,
  Exclude<TTaskEvent, InferenceTaskUpdateEvent>
> {
  return filter(
    (value): value is Exclude<TTaskEvent, InferenceTaskUpdateEvent> =>
      value.type === InferenceTaskEventType.Complete
  );
}
