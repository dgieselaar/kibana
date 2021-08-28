/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '../../../../../../src/core/server/saved_objects/types';
import type { SavedObject } from '../../../../../../src/core/types/saved_objects';
import { ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE } from '../../../common/constants/enrollment_api_key';
import type {
  EnrollmentAPIKey,
  EnrollmentAPIKeySOAttributes,
} from '../../../common/types/models/enrollment_api_key';
import { appContextService } from '../app_context';
import { normalizeKuery } from '../saved_object';

export async function listEnrollmentApiKeys(
  soClient: SavedObjectsClientContract,
  options: {
    page?: number;
    perPage?: number;
    kuery?: string;
    showInactive?: boolean;
  }
): Promise<{ items: EnrollmentAPIKey[]; total: any; page: any; perPage: any }> {
  const { page = 1, perPage = 20, kuery } = options;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { saved_objects, total } = await soClient.find<EnrollmentAPIKeySOAttributes>({
    type: ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
    page,
    perPage,
    sortField: 'created_at',
    sortOrder: 'desc',
    filter:
      kuery && kuery !== ''
        ? normalizeKuery(ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE, kuery)
        : undefined,
  });

  const items = saved_objects.map(savedObjectToEnrollmentApiKey);

  return {
    items,
    total,
    page,
    perPage,
  };
}

export async function getEnrollmentAPIKey(soClient: SavedObjectsClientContract, id: string) {
  const so = await appContextService
    .getEncryptedSavedObjects()
    .getDecryptedAsInternalUser<EnrollmentAPIKeySOAttributes>(
      ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
      id
    );
  return savedObjectToEnrollmentApiKey(so);
}

function savedObjectToEnrollmentApiKey({
  error,
  attributes,
  id,
}: SavedObject<EnrollmentAPIKeySOAttributes>): EnrollmentAPIKey {
  if (error) {
    throw new Error(error.message);
  }

  return {
    id,
    ...attributes,
  };
}
