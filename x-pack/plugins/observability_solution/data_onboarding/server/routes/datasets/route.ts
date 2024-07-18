/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { castArray } from 'lodash';
import { createDataOnboardingServerRoute } from '../create_data_onboarding_server_route';

const datasetsRoute = createDataOnboardingServerRoute({
  endpoint: 'GET /internal/data_onboarding/datasets',
  options: {
    tags: [],
  },
  handler: async (
    resources
  ): Promise<{
    dataViews: DataViewListItem[];
    aliases: Array<{ name: string; indices: string[] }>;
    indices: Array<{ name: string }>;
    dataStreams: Array<{ name: string; timestamp_field: string; backing_indices: string[] }>;
  }> => {
    const [core, dataViews] = await Promise.all([
      resources.context.core,
      resources.plugins.dataViews.start(),
    ]);

    const dataViewsService = await dataViews.dataViewsServiceFactory(
      core.savedObjects.client,
      core.elasticsearch.client.asCurrentUser
    );

    const internalUserEsClient = core.elasticsearch.client.asInternalUser;

    const [allDataViews, resolvedIndices] = await Promise.all([
      dataViewsService.getIdsWithTitle(),
      internalUserEsClient.indices.resolveIndex({
        name: ['*', '*:*', '-.*', '*:-.*'],
      }),
    ]);

    const { aliases, data_streams: dataStreams, indices } = resolvedIndices;

    return {
      dataViews: allDataViews,
      aliases: aliases.map((alias) => ({ ...alias, indices: castArray(alias.indices) })),
      dataStreams: dataStreams.map((dataStream) => ({
        ...dataStream,
        backing_indices: castArray(dataStream.backing_indices),
      })),
      indices: indices.filter((index) => !index.aliases),
    };
  },
});

export const datasetRoutes = {
  ...datasetsRoute,
};
