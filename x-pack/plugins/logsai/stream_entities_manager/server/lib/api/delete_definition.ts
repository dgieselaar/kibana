/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { APIEntityDefinition } from '@kbn/entities-schema';
import { SO_SEM_DEFINITION_TYPE } from '../../saved_objects';
import { DefinitionNotFound } from './errors';

export async function deleteDefinition(
  soClient: SavedObjectsClientContract,
  definition: APIEntityDefinition
) {
  try {
    await soClient.delete(SO_SEM_DEFINITION_TYPE, definition.id);
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      throw new DefinitionNotFound(`Entity definition with [${definition.id}] not found.`);
    }

    throw err;
  }
}
