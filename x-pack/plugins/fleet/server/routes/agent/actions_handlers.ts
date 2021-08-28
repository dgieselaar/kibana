/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';

import type { RequestHandler } from '../../../../../../src/core/server/http/router/router';
import type { PostNewAgentActionResponse } from '../../../common/types/rest_spec/agent';
import { defaultIngestErrorHandler } from '../../errors/handlers';
import type { ActionsService } from '../../services/agents/actions';
import type { PostNewAgentActionRequestSchema } from '../../types/rest_spec/agent';

// handlers that handle agent actions request
export const postNewAgentActionHandlerBuilder = function (
  actionsService: ActionsService
): RequestHandler<
  TypeOf<typeof PostNewAgentActionRequestSchema.params>,
  undefined,
  TypeOf<typeof PostNewAgentActionRequestSchema.body>
> {
  return async (context, request, response) => {
    try {
      const esClient = context.core.elasticsearch.client.asInternalUser;

      const agent = await actionsService.getAgent(esClient, request.params.agentId);

      const newAgentAction = request.body.action;

      const savedAgentAction = await actionsService.createAgentAction(esClient, {
        created_at: new Date().toISOString(),
        ...newAgentAction,
        agent_id: agent.id,
      });

      const body: PostNewAgentActionResponse = {
        item: savedAgentAction,
      };

      return response.ok({ body });
    } catch (error) {
      return defaultIngestErrorHandler({ error, response });
    }
  };
};
