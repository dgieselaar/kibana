/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { BaseFlags, FlagOptions } from '@kbn/dev-cli-runner';
import dedent from 'dedent';

export type SharedClientFlags = {
  target?: string;
  username?: string;
  password?: string;
  'api-key'?: string;
  cookie?: string;
};

export type KibanaClientFlags = {
  'kbn-internal-username'?: string;
  'kbn-internal-password'?: string;
};

export type EsClientFlags = {
  'es-target'?: string;
};

export type ClientFlags = BaseFlags<SharedClientFlags & KibanaClientFlags & EsClientFlags>;

export const clientFlags = {
  string: [
    'target',
    'username',
    'password',
    'api-key',
    'kbn-internal-username',
    'kbn-internal-password',
    'es-target',
    'cookie',
  ] as const,
  help: dedent(`
    --target                    base URL for Kibana
    --username                  Username for user requests
    --password                  Password for user requests
    --api-key                   API key to be used instead of username/password
    --kbn-internal-username     Username for Kibana internal user
    --kbn-internal-password     Password for Kibana internal user
    --es-target                 base URL for Elasticsearch. If not set, Kibana proxy will be used
    --cookie                    The value of the set-cookie header
    `),
} satisfies FlagOptions;
