/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Condition } from '@kbn/streamlang';
import { conditionSchema } from '@kbn/streamlang';

export interface System {
  name: string;
  filter: Condition;
  description: string;
}

export const systemSchema: z.Schema<System> = z.object({
  name: z.string(),
  filter: conditionSchema,
  description: z.string(),
});
