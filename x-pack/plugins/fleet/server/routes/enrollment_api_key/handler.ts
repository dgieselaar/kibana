/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';

import type { RequestHandler } from '../../../../../../src/core/server/http/router/router';
import type {
  DeleteEnrollmentAPIKeyResponse,
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
  PostEnrollmentAPIKeyResponse,
} from '../../../common/types/rest_spec/enrollment_api_key';
import { defaultIngestErrorHandler } from '../../errors/handlers';
import * as APIKeyService from '../../services/api_keys';
import type {
  DeleteEnrollmentAPIKeyRequestSchema,
  GetEnrollmentAPIKeysRequestSchema,
  GetOneEnrollmentAPIKeyRequestSchema,
  PostEnrollmentAPIKeyRequestSchema,
} from '../../types/rest_spec/enrollment_api_key';

export const getEnrollmentApiKeysHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetEnrollmentAPIKeysRequestSchema.query>
> = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;

  try {
    const { items, total, page, perPage } = await APIKeyService.listEnrollmentApiKeys(esClient, {
      page: request.query.page,
      perPage: request.query.perPage,
      kuery: request.query.kuery,
    });
    const body: GetEnrollmentAPIKeysResponse = { list: items, total, page, perPage };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
export const postEnrollmentApiKeyHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostEnrollmentAPIKeyRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  try {
    const apiKey = await APIKeyService.generateEnrollmentAPIKey(soClient, esClient, {
      name: request.body.name,
      expiration: request.body.expiration,
      agentPolicyId: request.body.policy_id,
    });

    const body: PostEnrollmentAPIKeyResponse = { item: apiKey, action: 'created' };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const deleteEnrollmentApiKeyHandler: RequestHandler<
  TypeOf<typeof DeleteEnrollmentAPIKeyRequestSchema.params>
> = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  try {
    await APIKeyService.deleteEnrollmentApiKey(esClient, request.params.keyId);

    const body: DeleteEnrollmentAPIKeyResponse = { action: 'deleted' };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `EnrollmentAPIKey ${request.params.keyId} not found` },
      });
    }
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getOneEnrollmentApiKeyHandler: RequestHandler<
  TypeOf<typeof GetOneEnrollmentAPIKeyRequestSchema.params>
> = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  try {
    const apiKey = await APIKeyService.getEnrollmentAPIKey(esClient, request.params.keyId);
    const body: GetOneEnrollmentAPIKeyResponse = { item: apiKey };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `EnrollmentAPIKey ${request.params.keyId} not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};
