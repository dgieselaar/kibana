/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { LicenseType } from '../../../common/types';
import { LICENSE_TYPE } from '../../../common/types';
import type { FeatureUsageServiceSetup } from '../../services/feature_usage_service';
import type { LicensingRouter } from '../../types';

export function registerRegisterFeatureRoute(
  router: LicensingRouter,
  featureUsageSetup: FeatureUsageServiceSetup
) {
  router.post(
    {
      path: '/internal/licensing/feature_usage/register',
      validate: {
        body: schema.arrayOf(
          schema.object({
            featureName: schema.string(),
            licenseType: schema.string({
              validate: (value) => {
                if (!(value in LICENSE_TYPE)) {
                  return `Invalid license type: ${value}`;
                }
              },
            }),
          })
        ),
      },
    },
    async (context, request, response) => {
      const registrations = request.body;

      registrations.forEach(({ featureName, licenseType }) => {
        featureUsageSetup.register(featureName, licenseType as LicenseType);
      });

      return response.ok({
        body: {
          success: true,
        },
      });
    }
  );
}
