/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RequestHandler } from '../../../../../../src/core/server/http/router/router';
import type {
  GetFleetStatusResponse,
  PostFleetSetupResponse,
} from '../../../common/types/rest_spec/fleet_setup';
import { defaultIngestErrorHandler } from '../../errors/handlers';
import { appContextService } from '../../services/app_context';
import { hasFleetServers } from '../../services/fleet_server';
import { setupIngestManager } from '../../services/setup';

export const getFleetStatusHandler: RequestHandler = async (context, request, response) => {
  try {
    const isApiKeysEnabled = await appContextService
      .getSecurity()
      .authc.apiKeys.areAPIKeysEnabled();
    const isFleetServerSetup = await hasFleetServers(appContextService.getInternalUserESClient());

    const missingRequirements: GetFleetStatusResponse['missing_requirements'] = [];
    if (!isApiKeysEnabled) {
      missingRequirements.push('api_keys');
    }

    if (!isFleetServerSetup) {
      missingRequirements.push('fleet_server');
    }

    const body: GetFleetStatusResponse = {
      isReady: missingRequirements.length === 0,
      missing_requirements: missingRequirements,
    };

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const fleetSetupHandler: RequestHandler = async (context, request, response) => {
  try {
    const soClient = context.core.savedObjects.client;
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const setupStatus = await setupIngestManager(soClient, esClient);
    const body: PostFleetSetupResponse = {
      ...setupStatus,
      nonFatalErrors: setupStatus.nonFatalErrors.map((e) => {
        // JSONify the error object so it can be displayed properly in the UI
        const error = e.error ?? e;
        return {
          name: error.name,
          message: error.message,
        };
      }),
    };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
