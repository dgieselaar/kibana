/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { generateStreamDescription, identifySystems } from '@kbn/streams-ai';
import type { Observable } from 'rxjs';
import { from, map } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import { omit } from 'lodash';
import { withoutChunkEvents, withoutTokenCountEvents } from '@kbn/inference-common';
import type { StreamQuery } from '@kbn/streams-schema';
import { Streams, type System } from '@kbn/streams-schema';
import { conditionSchema } from '@kbn/streamlang';
import {
  STREAMS_API_PRIVILEGES,
  STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE,
} from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { createServerRoute } from '../../../create_server_route';
import { DateFromString } from '../../../utils/date_from_string';
import type { UpsertStreamResponse } from '../../../../lib/streams/client';
import type { DashboardAsset, QueryAsset, RuleAsset } from '../../../../../common/assets';
import { ASSET_ID, ASSET_TYPE } from '../../../../lib/streams/assets/fields';

export type StreamDescriptionServerSentEvent = ServerSentEventBase<
  'stream_description',
  {
    content: string;
  }
>;

export type IdentifySystemsServerSentEvent = ServerSentEventBase<
  'identify_systems',
  {
    systems: System[];
  }
>;

export const generateStreamDescriptionRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/onboarding/_generate_stream_description',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z.object({
      start: DateFromString,
      end: DateFromString,
      kql: z.string(),
      connectorId: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<Observable<StreamDescriptionServerSentEvent>> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(
      STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
    );

    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { scopedClusterClient, streamsClient, inferenceClient } = await getScopedClients({
      request,
    });
    const {
      path: { name },
      query: { start, end, kql, connectorId },
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot read stream ${name}, insufficient privileges`);
    }

    const stream = await streamsClient.getStream(name);

    const boundInferenceClient = inferenceClient.bindTo({
      connectorId,
    });

    return generateStreamDescription({
      stream,
      start: start.valueOf(),
      end: end.valueOf(),
      esClient: scopedClusterClient.asCurrentUser,
      kql,
      inferenceClient: boundInferenceClient,
    }).pipe(
      withoutChunkEvents(),
      withoutTokenCountEvents(),
      map((event): StreamDescriptionServerSentEvent => {
        return {
          type: 'stream_description',
          content: event.content,
        };
      })
    );
  },
});

export const identifySystemsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/onboarding/_identify_systems',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z.object({
      start: DateFromString,
      end: DateFromString,
      kql: z.string(),
      connectorId: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<Observable<IdentifySystemsServerSentEvent>> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(
      STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
    );

    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { scopedClusterClient, streamsClient, inferenceClient } = await getScopedClients({
      request,
    });
    const {
      path: { name },
      query: { start, end, kql, connectorId },
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot read stream ${name}, insufficient privileges`);
    }

    const stream = await streamsClient.getStream(name);

    const boundInferenceClient = inferenceClient.bindTo({
      connectorId,
    });

    return from(
      identifySystems({
        stream,
        start: start.valueOf(),
        end: end.valueOf(),
        esClient: scopedClusterClient.asCurrentUser,
        kql,
        inferenceClient: boundInferenceClient,
        logger,
      })
    ).pipe(
      map(({ systems }): IdentifySystemsServerSentEvent => {
        return {
          type: 'identify_systems',
          systems,
        };
      })
    );
  },
});

export const addSystemsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/onboarding/_add_systems',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      systems: z.array(
        z.object({
          name: z.string(),
          filter: conditionSchema,
          description: z.string().optional(),
        })
      ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<UpsertStreamResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(
      STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
    );

    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { scopedClusterClient, streamsClient, assetClient } = await getScopedClients({
      request,
    });
    const {
      path: { name },
      body: { systems },
    } = params;

    const { write } = await checkAccess({ name, scopedClusterClient });
    if (!write) {
      throw new SecurityError(`Cannot update stream ${name}, insufficient privileges`);
    }

    const [stream, assets] = await Promise.all([
      streamsClient.getStream(name),
      assetClient.getAssets(name),
    ]);

    const dashboardAssets = assets.filter(
      (asset): asset is DashboardAsset => asset[ASSET_TYPE] === 'dashboard'
    );

    const queryAssets = assets
      .filter((asset): asset is QueryAsset => asset[ASSET_TYPE] === 'query')
      .map((asset): StreamQuery => {
        return asset.query;
      });

    const ruleAssets = assets.filter((asset): asset is RuleAsset => asset[ASSET_TYPE] === 'rule');

    const upsertRequest = {
      dashboards: dashboardAssets.map((asset) => asset[ASSET_ID]),
      queries: queryAssets,
      rules: ruleAssets.map((asset) => asset[ASSET_ID]),
      stream: {
        ...omit(stream, 'name'),
        systems: [
          ...(stream.systems ?? []),
          ...systems.map((system) => ({ ...system, description: system.description ?? '' })),
        ],
      },
    };

    Streams.all.UpsertRequest.asserts(upsertRequest);

    const update = await streamsClient.upsertStream({
      name: stream.name,
      request: upsertRequest,
    });

    return update;
  },
});

export const deleteSystemRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/{name}/onboarding/system/{systemName}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      systemName: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<UpsertStreamResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(
      STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
    );

    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { scopedClusterClient, streamsClient, assetClient } = await getScopedClients({
      request,
    });
    const {
      path: { name, systemName },
    } = params;

    const { write } = await checkAccess({ name, scopedClusterClient });
    if (!write) {
      throw new SecurityError(`Cannot update stream ${name}, insufficient privileges`);
    }

    const [stream, assets] = await Promise.all([
      streamsClient.getStream(name),
      assetClient.getAssets(name),
    ]);

    const dashboardAssets = assets.filter(
      (asset): asset is DashboardAsset => asset[ASSET_TYPE] === 'dashboard'
    );

    const queryAssets = assets
      .filter((asset): asset is QueryAsset => asset[ASSET_TYPE] === 'query')
      .map((asset): StreamQuery => {
        return asset.query;
      });

    const ruleAssets = assets.filter((asset): asset is RuleAsset => asset[ASSET_TYPE] === 'rule');

    const upsertRequest = {
      dashboards: dashboardAssets.map((asset) => asset[ASSET_ID]),
      queries: queryAssets,
      rules: ruleAssets.map((asset) => asset[ASSET_ID]),
      stream: {
        ...omit(stream, 'name'),
        systems: stream.systems?.filter((system) => system.name !== systemName),
      },
    };

    Streams.all.UpsertRequest.asserts(upsertRequest);

    const update = await streamsClient.upsertStream({
      name: stream.name,
      request: upsertRequest,
    });

    return update;
  },
});

export const updateSystemRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/{name}/onboarding/system/{systemName}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      systemName: z.string(),
    }),
    body: z.object({
      filter: conditionSchema,
      description: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<UpsertStreamResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(
      STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
    );

    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { scopedClusterClient, streamsClient, assetClient } = await getScopedClients({
      request,
    });
    const {
      path: { name, systemName },
      body: { description, filter },
    } = params;

    const { write } = await checkAccess({ name, scopedClusterClient });
    if (!write) {
      throw new SecurityError(`Cannot update stream ${name}, insufficient privileges`);
    }

    const [stream, assets] = await Promise.all([
      streamsClient.getStream(name),
      assetClient.getAssets(name),
    ]);

    const dashboardAssets = assets.filter(
      (asset): asset is DashboardAsset => asset[ASSET_TYPE] === 'dashboard'
    );

    const queryAssets = assets
      .filter((asset): asset is QueryAsset => asset[ASSET_TYPE] === 'query')
      .map((asset): StreamQuery => {
        return asset.query;
      });

    const ruleAssets = assets.filter((asset): asset is RuleAsset => asset[ASSET_TYPE] === 'rule');

    const upsertRequest = {
      dashboards: dashboardAssets.map((asset) => asset[ASSET_ID]),
      queries: queryAssets,
      rules: ruleAssets.map((asset) => asset[ASSET_ID]),
      stream: {
        ...omit(stream, 'name'),
        systems: stream.systems?.map((system) => {
          if (system.name === systemName) {
            return {
              name: systemName,
              description,
              filter,
            };
          }
          return system;
        }),
      },
    };

    Streams.all.UpsertRequest.asserts(upsertRequest);

    const update = await streamsClient.upsertStream({
      name: stream.name,
      request: upsertRequest,
    });

    return update;
  },
});

export const internalOnboardingRoutes = {
  ...generateStreamDescriptionRoute,
  ...identifySystemsRoute,
  ...addSystemsRoute,
  ...deleteSystemRoute,
  ...updateSystemRoute,
};
