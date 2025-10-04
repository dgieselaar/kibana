/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFlags } from '@kbn/dev-cli-runner';
import type { ClientFlags } from '@kbn/kibana-api-cli';

export type FromTracesCliFlags = BaseFlags<
  ClientFlags & {
    from?: string;
    to?: string;
    kql?: string;
    'events-kql'?: string;
    'max-docs'?: string;
  }
>;

export const DEFAULT_INSPECTOR_PORT = 9229;

export const NO_GREP = '__NO_GREP__';
