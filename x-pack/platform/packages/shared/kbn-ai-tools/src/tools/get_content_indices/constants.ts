/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexPatternToCss } from '@kbn/std';

export const EXCLUDE_DATA_STREAM_PATTERNS = indexPatternToCss([
  'logs*',
  'metrics*',
  'traces*',
  '.ds*',
]);
