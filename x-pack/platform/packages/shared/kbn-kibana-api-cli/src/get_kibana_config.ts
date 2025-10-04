/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { getConfigFromFiles } from '@kbn/config';
import { getConfigDirectory } from '@kbn/utils';
import { pick } from 'lodash';

function pickAsMaybeStrings<T extends string>(
  source: object,
  ...keys: T[]
): Record<T, string | undefined> {
  return pick(source, keys) as Record<T, string | undefined>;
}

export function getKibanaConfig() {
  const configDir = getConfigDirectory();
  const configFile = Path.join(configDir, 'kibana.yml');
  const devConfigFile = Path.join(configDir, 'kibana.dev.yml');

  const config = getConfigFromFiles([configFile, devConfigFile]);

  return {
    ...pickAsMaybeStrings(
      config,
      'server.host',
      'server.port',
      'elasticsearch.hosts',
      'elasticsearch.username',
      'elasticsearch.password',
      'elasticsearch.serviceAccountToken'
    ),
  };
}
