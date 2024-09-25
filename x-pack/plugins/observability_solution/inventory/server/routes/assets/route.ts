/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { notFound } from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { getSuggestedDashboards } from './get_suggested_dashboards';
import { getEntityById } from '../entities/get_entity_by_id';
import { getEntityDefinition } from '../entities/get_entity_definition';
import { AssetSuggestion } from '../../../common/assets';
import { getSuggestedRules } from './get_suggested_rules';
import { withInventorySpan } from '../../lib/with_inventory_span';

const getHardLinkedAssetsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/assets/entity',
  params: t.type({
    body: t.type({
      entity: t.type({
        type: t.string,
        displayName: t.string,
      }),
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ context, logger, params }): Promise<void> => {},
});

const getSuggestedAssetsRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/assets/entity/suggestions',
  params: t.type({
    body: t.type({
      entity: t.type({
        type: t.string,
        displayName: t.string,
      }),
      start: t.number,
      end: t.number,
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
  }): Promise<{ suggestions: AssetSuggestion[] }> => {
    const [coreContext, alertingStart] = await Promise.all([
      context.core,
      plugins.alerting.start(),
    ]);

    const esClient = createObservabilityEsClient({
      client: coreContext.elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const savedObjectsClient = coreContext.savedObjects.client;

    const {
      body: {
        entity: { displayName, type },
        start,
        end,
      },
    } = params;

    const [entity, definition, ruleTypes, rulesClient] = await Promise.all([
      getEntityById({
        esClient,
        displayName,
        type,
      }),
      getEntityDefinition({
        type,
        plugins,
        request,
        logger,
      }),
      alertingStart.listTypes(),
      alertingStart.getRulesClientWithRequest(request),
    ]);

    if (!entity || !definition) {
      throw notFound();
    }

    const [dashboardDataChecks, ruleSuggestions, sloSuggestions] = await withInventorySpan(
      'get_suggestions',
      () =>
        Promise.all([
          getSuggestedDashboards({
            start,
            end,
            entity,
            identityFields: definition.identityFields,
            savedObjectsClient,
            esClient,
            logger,
          }),
          getSuggestedRules({
            entity,
            identityFields: definition.identityFields,
            esClient,
            start,
            end,
            rulesClient,
            ruleTypes: Array.from(ruleTypes.values()),
            logger,
          }),
          Promise.resolve([]),
        ]),
      logger
    );

    const dashboardsWithCounts = dashboardDataChecks.map((dashboard) => {
      const counts = {
        unknown: 0,
        has_data: 0,
        has_no_data: 0,
      };

      dashboard.panels.forEach((panel) => {
        counts[panel.check]++;
      });

      return {
        id: dashboard.id,
        title: dashboard.title,
        counts,
      };
    });

    const dashboardsWithAnyData = orderBy(
      dashboardsWithCounts.filter(({ counts }) => {
        return counts.has_data > 0;
      }),
      (dashboard) => dashboard.counts.has_data,
      'desc'
    );

    return {
      suggestions: dashboardsWithAnyData
        .map((dashboard): AssetSuggestion => {
          return {
            asset: {
              type: 'dashboard',
              displayName: dashboard.title,
              id: dashboard.id,
            },
            description: i18n.translate('xpack.inventory.suggestions.dashboardSuggestion', {
              defaultMessage: `At least {withDataCount, plural, one {# panel out of {totalCount} has} other {# panels out of {totalCount} have}} data for this {type}`,
              values: {
                withDataCount: dashboard.counts.has_data,
                totalCount:
                  dashboard.counts.has_no_data +
                  dashboard.counts.has_data +
                  dashboard.counts.unknown,
                type: entity.type,
              },
            }),
          };
        })
        .concat(ruleSuggestions)
        .filter((suggestion) => {
          const hasExistingLinkToSuggestion = entity.links.some((link) => {
            return (
              link.type === 'asset' &&
              link.asset.id === suggestion.asset.id &&
              link.asset.type === suggestion.asset.type
            );
          });

          return !hasExistingLinkToSuggestion;
        }),
    };
  },
});

export const assetsRoutes = {
  ...getHardLinkedAssetsRoute,
  ...getSuggestedAssetsRoute,
};
