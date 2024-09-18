/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers, SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDiscoveryApiKeyType } from '../../../saved_objects';
import { EntityManagerServerSetup } from '../../../types';
import { EntityDiscoveryAPIKey } from './api_key';

const ENTITY_DISCOVERY_API_KEY_SO_ID = '19540C97-E35C-485B-8566-FB86EC8455E4';

const getEncryptedSOClient = (server: EntityManagerServerSetup) => {
  return server.encryptedSavedObjects.getClient({
    includedHiddenTypes: [EntityDiscoveryApiKeyType.name],
  });
};

export const readEntityDiscoveryAPIKey = async (
  server: EntityManagerServerSetup,
  id = ENTITY_DISCOVERY_API_KEY_SO_ID
) => {
  try {
    const soClient = getEncryptedSOClient(server);
    const obj = await soClient.getDecryptedAsInternalUser<EntityDiscoveryAPIKey>(
      EntityDiscoveryApiKeyType.name,
      id
    );
    return obj?.attributes;
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return undefined;
    }
    throw err;
  }
};

export const saveEntityDiscoveryAPIKey = async (
  soClient: SavedObjectsClientContract,
  apiKey: EntityDiscoveryAPIKey,
  id = ENTITY_DISCOVERY_API_KEY_SO_ID
) => {
  await soClient.create(EntityDiscoveryApiKeyType.name, apiKey, {
    id,
    overwrite: true,
    managed: true,
  });
};

export const deleteEntityDiscoveryAPIKey = async (
  soClient: SavedObjectsClientContract,
  id = ENTITY_DISCOVERY_API_KEY_SO_ID
) => {
  await soClient.delete(EntityDiscoveryApiKeyType.name, id);
};
