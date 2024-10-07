/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { ApiScraperServer } from '../../../types';
import {
  canManageApiScraperDefinition,
  apiScraperDefinitionRuntimePrivileges,
} from '../privileges';

export interface ApiScraperAPIKey {
  id: string;
  name: string;
  apiKey: string;
}

export const checkIfAPIKeysAreEnabled = async (server: ApiScraperServer): Promise<boolean> => {
  return await server.security.authc.apiKeys.areAPIKeysEnabled();
};

export const checkIfEntityDiscoveryAPIKeyIsValid = async (
  server: ApiScraperServer,
  apiKey: ApiScraperAPIKey,
  definitionId: string
): Promise<boolean> => {
  server.logger.debug('validating API key against authentication service');

  const isValid = await server.security.authc.apiKeys.validate({
    id: apiKey.id,
    api_key: apiKey.apiKey,
  });

  if (!isValid) return false;

  // this fake kibana request is how you get an API key-scoped client...
  const esClient = server.core.elasticsearch.client.asScoped(
    getFakeKibanaRequest({
      id: apiKey.id,
      api_key: apiKey.apiKey,
    })
  ).asCurrentUser;

  server.logger.debug('validating API key has runtime privileges for entity discovery');

  return canManageApiScraperDefinition(esClient, definitionId);
};

export const generateApiScraperAPIKey = async (
  server: ApiScraperServer,
  req: KibanaRequest,
  definitionId = 'built-in definitions'
): Promise<ApiScraperAPIKey | undefined> => {
  const apiKey = await server.security.authc.apiKeys.grantAsInternalUser(req, {
    name: `Entity discovery API key for ${definitionId}`,
    role_descriptors: {
      entity_discovery_admin: apiScraperDefinitionRuntimePrivileges(definitionId),
    },
    kibana_role_descriptors: {
      entity_discovery_admin: {
        kibana: [
          {
            spaces: ['*'],
            feature: {},
          },
        ],
        elasticsearch: {},
      },
    },
    metadata: {
      description:
        'API key used to manage the transforms and ingest pipelines created by the entity discovery framework',
    },
  });

  if (apiKey !== null) {
    return {
      id: apiKey.id,
      name: apiKey.name,
      apiKey: apiKey.api_key,
    };
  }
};
