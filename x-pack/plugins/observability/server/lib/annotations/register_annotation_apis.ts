/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import type { CoreSetup } from '../../../../../../src/core/server';
import type { RequestHandler } from '../../../../../../src/core/server/http/router/router';
import {
  createAnnotationRt,
  deleteAnnotationRt,
  getAnnotationByIdRt,
} from '../../../common/annotations';
import type { ObservabilityRequestHandlerContext } from '../../types';
import type { ScopedAnnotationsClient } from './bootstrap_annotations';
import { createAnnotationsClient } from './create_annotations_client';

const unknowns = schema.object({}, { unknowns: 'allow' });

export function registerAnnotationAPIs({
  core,
  index,
  logger,
}: {
  core: CoreSetup;
  index: string;
  logger: Logger;
}) {
  function wrapRouteHandler<TType extends t.Type<any>>(
    types: TType,
    handler: (params: { data: t.TypeOf<TType>; client: ScopedAnnotationsClient }) => Promise<any>
  ): RequestHandler<unknown, unknown, unknown, ObservabilityRequestHandlerContext> {
    return async (
      ...args: Parameters<
        RequestHandler<unknown, unknown, unknown, ObservabilityRequestHandlerContext>
      >
    ) => {
      const [context, request, response] = args;

      const rt = types;

      const data = {
        body: request.body,
        query: request.query,
        params: request.params,
      };

      const validation = rt.decode(data);

      if (isLeft(validation)) {
        return response.badRequest({
          body: PathReporter.report(validation).join(', '),
        });
      }

      const esClient = context.core.elasticsearch.client.asCurrentUser;

      const client = createAnnotationsClient({
        index,
        esClient,
        logger,
        license: context.licensing?.license,
      });

      try {
        const res = await handler({
          data: validation.right,
          client,
        });

        return response.ok({
          body: res,
        });
      } catch (err) {
        return response.custom({
          statusCode: err.output?.statusCode ?? 500,
          body: {
            message: err.output?.payload?.message ?? 'An internal server error occured',
          },
        });
      }
    };
  }

  const router = core.http.createRouter<ObservabilityRequestHandlerContext>();

  router.post(
    {
      path: '/api/observability/annotation',
      validate: {
        body: unknowns,
      },
    },
    wrapRouteHandler(t.type({ body: createAnnotationRt }), ({ data, client }) => {
      return client.create(data.body);
    })
  );

  router.delete(
    {
      path: '/api/observability/annotation/{id}',
      validate: {
        params: unknowns,
      },
    },
    wrapRouteHandler(t.type({ params: deleteAnnotationRt }), ({ data, client }) => {
      return client.delete(data.params);
    })
  );

  router.get(
    {
      path: '/api/observability/annotation/{id}',
      validate: {
        params: unknowns,
      },
    },
    wrapRouteHandler(t.type({ params: getAnnotationByIdRt }), ({ data, client }) => {
      return client.getById(data.params);
    })
  );
}
