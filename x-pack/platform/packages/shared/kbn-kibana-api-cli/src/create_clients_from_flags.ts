/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClientOptions } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import { castArray } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ClientFlags } from './flags';
import { getKibanaConfig } from './get_kibana_config';
import { KibanaClient } from './client';

export function createClientsFromFlags({
  flags,
  signal,
}: {
  flags: ClientFlags;
  signal: AbortSignal;
}): {
  kibana: KibanaClient;
  asCurrentUser: ElasticsearchClient;
  asInternalUser?: ElasticsearchClient;
} {
  const config = getKibanaConfig();

  const defaultServerHost = config['server.host'] ?? 'http://localhost';
  const defaultServerPort = config['server.port'] ?? '5601';

  const defaultEsHost = castArray(config['elasticsearch.hosts'] ?? 'http://localhost:9200')[0];

  const defaultInternalEsUsername = config['elasticsearch.username'] || 'kibana_system';
  const defaultInternalEsPassword = config['elasticsearch.password'] || 'changeme';

  const parsedTarget = new URL(flags.target || `${defaultServerHost}:${defaultServerPort}`);

  const parsedEsTarget = new URL(flags['es-target'] || defaultEsHost);

  const userAuth: ClientOptions['auth'] = flags.cookie
    ? undefined
    : flags['api-key']
    ? { apiKey: flags['api-key'] }
    : flags.username && flags.password
    ? {
        username: flags.username,
        password: flags.password,
      }
    : {
        username: 'elastic',
        password: 'changeme',
      };

  const internalAuth: ClientOptions['auth'] =
    flags['kbn-internal-username'] && flags['kbn-internal-password']
      ? {
          username: flags['kbn-internal-username'],
          password: flags['kbn-internal-username'],
        }
      : {
          username: defaultInternalEsUsername,
          password: defaultInternalEsPassword,
        };

  const kibanaClient = new KibanaClient({
    baseUrl: parsedTarget.toString(),
    signal,
    auth: userAuth,
    headers: flags.cookie
      ? {
          Cookie: flags.cookie,
        }
      : {},
  });

  if (flags.cookie) {
    return {
      kibana: kibanaClient,
      asCurrentUser: kibanaClient.es,
    };
  }

  return {
    kibana: kibanaClient,
    asCurrentUser: new Client({
      node: parsedEsTarget.toString(),
      auth: userAuth,
    }),
    asInternalUser: new Client({
      node: parsedEsTarget.toString(),
      auth: internalAuth,
    }),
  };
}
