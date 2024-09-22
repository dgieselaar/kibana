/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notFound } from '@hapi/boom';
import { Logger, SavedObject } from '@kbn/core/server';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import * as t from 'io-ts';
import { partition } from 'lodash';
import { toNumberRt } from '@kbn/io-ts-utils';
import {
  LATEST_ENTITIES_INDEX,
  type Entity,
  type EntityWithSignals,
  type InventoryEntityDefinition,
  type VirtualEntityDefinition,
} from '../../../common/entities';
import { esqlResultToPlainObjects } from '../../../common/utils/esql_result_to_plain_objects';
import { getEntitySourceDslFilter } from '../../../common/utils/get_entity_source_dsl_filter';
import { getEsqlRequest } from '../../../common/utils/get_esql_request';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { InventoryRouteHandlerResources } from '../types';
import {
  DashboardWithEntityDataCheck,
  checkDashboardsForEntityData,
} from './check_dashboards_for_entity_data';
import { eemToInventoryDefinition } from './eem_to_inventory_definition';
import { getDataStreamsForFilter } from './get_data_streams_for_filter';
import { getEntitiesFromSource } from './get_entities_from_source';
import { getEntityById } from './get_entity_by_id';
import { getLatestEntities } from './get_latest_entities';
import { getEntitySignals } from '../signals/get_entity_signals';
import { getEntityDefinition } from './get_entity_definition';
import { withInventorySpan } from '../../lib/with_inventory_span';
import { createInventoryEsClient } from '../../lib/clients/create_inventory_es_client';
import { createEntityClient } from '../../lib/clients/create_entity_client';
import { serializeLink } from '../../../common/links';
import { searchEntities } from './search_entities';

export async function fetchEntityDefinitions({
  request,
  plugins: { entityManager },
  logger,
}: {
  request: InventoryRouteHandlerResources['request'];
  plugins: {
    entityManager: InventoryRouteHandlerResources['plugins']['entityManager'];
  };
  logger: Logger;
}) {
  const entityManagerStart = await entityManager.start();
  const client = await entityManagerStart.getScopedClient({ request });

  return withInventorySpan(
    'get_entity_definitions',
    () =>
      client.getEntityDefinitions({
        page: 1,
        perPage: 10000,
      }),
    logger
  );
}

const listInventoryDefinitionsRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities/definition/inventory',
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({
    plugins,
    request,
    logger,
  }): Promise<{ definitions: InventoryEntityDefinition[] }> => {
    const { definitions } = await fetchEntityDefinitions({ plugins, request, logger });

    return {
      definitions: definitions.map(eemToInventoryDefinition),
    };
  },
});

const listInventoryEntitiesRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entities/inventory',
  params: t.type({
    body: t.intersection([
      t.type({
        kuery: t.string,
        start: t.number,
        end: t.number,
        type: t.union([t.literal('all'), t.string]),
      }),
      t.partial({
        fromSourceIfEmpty: t.boolean,
        dslFilter: t.array(t.record(t.string, t.any)),
      }),
    ]),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({
    context,
    logger,
    params,
    plugins,
    request,
  }): Promise<{ entities: EntityWithSignals[] }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const {
      body: { start, end, kuery, type, fromSourceIfEmpty, dslFilter },
    } = params;

    const [rulesClient, alertsClient, { definitions }] = await Promise.all([
      plugins.alerting
        .start()
        .then((alertingStart) => alertingStart.getRulesClientWithRequest(request)),
      plugins.ruleRegistry
        .start()
        .then((ruleRegistryStart) => ruleRegistryStart.getRacClientWithRequest(request)),
      fetchEntityDefinitions({ plugins, request, logger }),
    ]);

    return {
      entities: await getLatestEntities({
        esClient,
        start,
        end,
        kuery,
        fromSourceIfEmpty,
        typeDefinitions: (type === 'all'
          ? definitions
          : definitions.filter((definition) => definition.type === type)
        ).map(eemToInventoryDefinition),
        logger,
        dslFilter,
        rulesClient,
        alertsClient,
      }),
    };
  },
});

const listRelationshipsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entity/relationships',
  params: t.type({
    body: t.type({
      displayName: t.string,
      type: t.string,
      start: t.number,
      end: t.number,
      indexPatterns: t.array(t.string),
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({
    context,
    logger,
    params,
    plugins,
    request,
  }): Promise<{ relatedEntities: Array<Pick<Entity, 'displayName' | 'type'>> }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const {
      body: { start, end, displayName, type, indexPatterns },
    } = params;

    const [{ definitions }, entity] = await Promise.all([
      fetchEntityDefinitions({ plugins, request, logger }),
      getEntityById({
        esClient,
        displayName,
        type,
      }),
    ]);

    if (!entity) {
      throw notFound();
    }

    const allDefinitions = definitions.map(eemToInventoryDefinition);

    const [[ownDefinition], allOtherDefinitions] = partition(
      allDefinitions,
      (definition) => definition.type === type
    );
    const entitySourceDslFilter = getEntitySourceDslFilter({
      entity,
      identityFields: ownDefinition.identityFields,
    });

    const relatedEntitiesFromSource = await Promise.all(
      allOtherDefinitions.map((definition) =>
        getEntitiesFromSource({
          esClient,
          start,
          end,
          definition,
          indexPatterns,
          logger,
          kuery: '',
          dslFilter: entitySourceDslFilter,
        })
      )
    );

    return {
      relatedEntities: relatedEntitiesFromSource.flat(),
    };
  },
});

const listVirtualEntityDefinitionsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entities/definition/virtual',
  params: t.type({
    body: t.type({
      parentTypeId: t.string,
      kuery: t.string,
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async (): Promise<{ definitions: VirtualEntityDefinition[] }> => {
    return {
      definitions: [],
    };
  },
});

const listDataStreamsForEntityRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/data_streams/find_datastreams_for_filter',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    body: t.type({
      kql: t.string,
      indexPatterns: t.array(t.string),
      start: t.number,
      end: t.number,
    }),
  }),
  handler: async ({
    params,
    context,
    logger,
  }): Promise<{ dataStreams: Array<{ name: string }> }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const { start, end, kql, indexPatterns } = params.body;

    return {
      dataStreams: await getDataStreamsForFilter({
        kql,
        indexPatterns,
        start,
        end,
        esClient,
      }),
    };
  },
});

const getEntityRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entity/{type}/{displayName}',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    path: t.type({
      type: t.string,
      displayName: t.string,
    }),
    query: t.type({
      start: toNumberRt,
      end: toNumberRt,
    }),
  }),
  handler: async ({
    params,
    context,
    logger,
    request,
    plugins,
  }): Promise<{ entity: EntityWithSignals }> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const {
      path: { type, displayName },
      query: { start, end },
    } = params;

    const [entity, typeDefinition, alertsClient, rulesClient] = await Promise.all([
      getEntityById({ displayName, type, esClient }),
      getEntityDefinition({
        request,
        plugins,
        type,
        logger,
      }),
      plugins.ruleRegistry
        .start()
        .then((ruleRegistryStart) => ruleRegistryStart.getRacClientWithRequest(request)),
      plugins.alerting
        .start()
        .then((alertingStart) => alertingStart.getRulesClientWithRequest(request)),
    ]);

    if (!entity || !typeDefinition) {
      throw notFound();
    }

    const entityWithSignals = await getEntitySignals({
      alertsClient,
      rulesClient,
      start,
      end,
      logger,
      entities: [entity],
      typeDefinitions: [typeDefinition],
    });

    return {
      entity: entityWithSignals[0],
    };
  },
});

const checkDashboardsForDataRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entities/check_dashboards_for_data',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    body: t.type({
      dashboardIds: t.array(t.string),
      entity: t.type({
        displayName: t.string,
        type: t.string,
      }),
      start: t.number,
      end: t.number,
    }),
  }),
  handler: async ({
    request,
    plugins,
    logger,
    context,
    params,
  }): Promise<{
    dashboards: DashboardWithEntityDataCheck[];
  }> => {
    const {
      body: {
        dashboardIds,
        entity: { type, displayName },
        start,
        end,
      },
    } = params;

    const coreContext = await context.core;

    const esClient = createObservabilityEsClient({
      client: coreContext.elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const [dashboardsSoBulkResponse, definition, entity] = await Promise.all([
      coreContext.savedObjects.client.bulkGet(
        dashboardIds.map((dashboardId) => ({ id: dashboardId, type: 'dashboard' }))
      ),
      fetchEntityDefinitions({
        plugins,
        request,
        logger,
      }).then(({ definitions }) => {
        return definitions.find((def) => def.type === type);
      }),
      getEntityById({
        esClient,
        type,
        displayName,
      }),
    ]);

    if (!definition) {
      throw notFound();
    }
    return {
      dashboards: await checkDashboardsForEntityData({
        dashboards: dashboardsSoBulkResponse.saved_objects as Array<
          SavedObject<DashboardAttributes>
        >,
        entity,
        esClient,
        identityFields: definition.identityFields,
        logger,
        start,
        end,
      }),
    };
  },
});

const updateEntityLinksRoute = createInventoryServerRoute({
  endpoint: 'PUT /internal/inventory/entity/{type}/{displayName}/links',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    body: t.type({
      entity: t.type({
        displayName: t.string,
        type: t.string,
      }),
      links: t.array(
        t.type({
          type: t.literal('asset'),
          asset: t.type({
            type: t.union([t.literal('dashboard'), t.literal('sloDefinition'), t.literal('rule')]),
            id: t.string,
          }),
        })
      ),
    }),
  }),
  handler: async ({ context, logger, plugins, request, params }): Promise<{ entity: Entity }> => {
    const {
      body: { entity, links },
    } = params;

    const [esClient, entityClient, definition] = await Promise.all([
      createInventoryEsClient({ context, logger }),
      createEntityClient({ plugins, request }),
      getEntityDefinition({
        type: entity.type,
        request,
        plugins,
        logger,
      }),
    ]);

    if (!definition) {
      throw notFound(`Definition for ${entity.type} not found`);
    }

    const entityFromSource = await getEntityById({
      esClient,
      displayName: entity.displayName,
      type: entity.type,
    });

    await entityClient.updateEntity({
      definitionId: definition.id,
      id: entityFromSource.properties['entity.id'] as string,
      doc: {
        ...entityFromSource.properties,
        entity: {
          links: links.map((link) => serializeLink(link)),
        },
      },
    });

    return {
      entity: await getEntityById({
        esClient,
        type: entity.type,
        displayName: entity.displayName,
      }),
    };
  },
});

const listEntitiesRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/entities',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    body: t.type({
      kuery: t.string,
      start: t.number,
      end: t.number,
    }),
  }),
  handler: async ({ params, context, logger }): Promise<{ entities: Entity[] }> => {
    const esClient = await createInventoryEsClient({ context, logger });

    const {
      body: { kuery, start, end },
    } = params;

    const response = await esClient.esql('get_entity', {
      ...getEsqlRequest({
        query: `FROM ${LATEST_ENTITIES_INDEX}`,
        kuery,
        start,
        end,
      }),
    });

    if (response.values.length === 0) {
      throw notFound();
    }

    return {
      entities: esqlResultToPlainObjects(response),
    };
  },
});

const searchEntitiesRoute = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entities/search',
  options: {
    tags: ['access:inventory'],
  },
  params: t.type({
    query: t.type({
      displayName: t.string,
      size: toNumberRt,
    }),
  }),
  handler: async ({
    params,
    context,
    logger,
  }): Promise<{ entities: Array<{ score: number; entity: Entity }> }> => {
    const esClient = await createInventoryEsClient({ context, logger });

    const {
      query: { displayName, size },
    } = params;

    return {
      entities: await searchEntities({
        displayName,
        esClient,
        size,
      }),
    };
  },
});

export const entitiesRoutes = {
  ...listInventoryDefinitionsRoute,
  ...listVirtualEntityDefinitionsRoute,
  ...listInventoryEntitiesRoute,
  ...listDataStreamsForEntityRoute,
  ...getEntityRoute,
  ...listEntitiesRoute,
  ...listRelationshipsRoute,
  ...checkDashboardsForDataRoute,
  ...updateEntityLinksRoute,
  ...searchEntitiesRoute,
};
