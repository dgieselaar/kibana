/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Make sure strings are expected for input, but still converted to a Date,
 * without breaking the OpenAPI generator.
 */
export const DateFromString = z.string().transform((input) => new Date(input));
