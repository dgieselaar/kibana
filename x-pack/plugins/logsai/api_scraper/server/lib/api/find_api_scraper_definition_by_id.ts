/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { SO_API_SCRAPER_DEFINITION_TYPE } from '../../saved_objects';
import { ApiDefinitionNotFound } from './errors/api_scraper_not_found';
import { ApiScraperDefinition } from '../../../common/types';

export async function findApiScraperDefinitionById({
  id,
  soClient,
}: {
  id: string;
  soClient: SavedObjectsClientContract;
}) {
  const response = await soClient.find<ApiScraperDefinition>({
    type: SO_API_SCRAPER_DEFINITION_TYPE,
    filter: `${SO_API_SCRAPER_DEFINITION_TYPE}.attributes.id:(${id})`,
  });

  if (response.saved_objects.length === 0) {
    throw new ApiDefinitionNotFound(`Unable to find API definition [${id}] `);
  }

  return response.saved_objects[0].attributes;
}
