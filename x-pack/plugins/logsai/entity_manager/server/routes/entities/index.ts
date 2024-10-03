/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntityDefinitionRoute } from './definition/create';
import { deleteEntityDefinitionRoute } from './definition/delete';
import { resetEntityDefinitionRoute } from './definition/reset';
import { updateEntityDefinitionRoute } from './definition/update';
import { getEntityDefinitionRoute } from './definition/get';

import { findEntitiesRoute } from './find';
import { updateEntityRoute } from './update';

import { createEntityAPIDefinitionRoute } from './definition/api/create';
import { deleteEntityApiDefinitionRoute } from './definition/api/delete';
import { previewEntityApiDefinitionRoute } from './definition/api/preview';

export const entitiesRoutes = {
  ...createEntityDefinitionRoute,
  ...deleteEntityDefinitionRoute,
  ...resetEntityDefinitionRoute,
  ...updateEntityDefinitionRoute,
  ...getEntityDefinitionRoute,
  ...findEntitiesRoute,
  ...updateEntityRoute,
  ...createEntityAPIDefinitionRoute,
  ...deleteEntityApiDefinitionRoute,
  ...previewEntityApiDefinitionRoute,
};
