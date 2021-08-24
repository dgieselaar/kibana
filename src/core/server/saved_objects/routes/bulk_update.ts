/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { CoreUsageDataSetup } from '../../core_usage_data/types';
import type { IRouter } from '../../http/router/router';
import { catchAndReturnBoomErrors } from './utils';

interface RouteDependencies {
  coreUsageData: CoreUsageDataSetup;
}

export const registerBulkUpdateRoute = (router: IRouter, { coreUsageData }: RouteDependencies) => {
  router.put(
    {
      path: '/_bulk_update',
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
            attributes: schema.recordOf(schema.string(), schema.any()),
            version: schema.maybe(schema.string()),
            references: schema.maybe(
              schema.arrayOf(
                schema.object({
                  name: schema.string(),
                  type: schema.string(),
                  id: schema.string(),
                })
              )
            ),
            namespace: schema.maybe(schema.string({ minLength: 1 })),
          })
        ),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsBulkUpdate({ request: req }).catch(() => {});

      const savedObject = await context.core.savedObjects.client.bulkUpdate(req.body);
      return res.ok({ body: savedObject });
    })
  );
};
