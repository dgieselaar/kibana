/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OperatorFunction, scan } from 'rxjs';
import { InferenceTaskUpdateEvent } from '../tasks';

export function concatenateTaskUpdateEvents(): OperatorFunction<
  InferenceTaskUpdateEvent,
  { content: string }
> {
  return scan(
    (acc, { chunk }) => {
      return { content: acc.content + chunk };
    },
    { content: '' }
  );
}
