/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '../../../../src/core/public/http/types';

export type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  pathname: string;
  isCachable?: boolean;
  method?: string;
  body?: any;
};
