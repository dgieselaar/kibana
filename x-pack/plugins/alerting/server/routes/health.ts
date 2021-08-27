/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '../../../../../src/core/server/http/router/router';
import type { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server/plugin';
import type { AlertingFrameworkHealth } from '../../common';
import { BASE_ALERTING_API_PATH } from '../../common';
import type { ILicenseState } from '../lib/license_state';
import type { AlertingRequestHandlerContext } from '../types';
import type { RewriteResponseCase } from './lib/rewrite_request_case';
import { verifyAccessAndContext } from './lib/verify_access_and_context';

const rewriteBodyRes: RewriteResponseCase<AlertingFrameworkHealth> = ({
  isSufficientlySecure,
  hasPermanentEncryptionKey,
  alertingFrameworkHeath,
  ...rest
}) => ({
  ...rest,
  is_sufficiently_secure: isSufficientlySecure,
  has_permanent_encryption_key: hasPermanentEncryptionKey,
  alerting_framework_heath: {
    decryption_health: alertingFrameworkHeath.decryptionHealth,
    execution_health: alertingFrameworkHeath.executionHealth,
    read_health: alertingFrameworkHeath.readHealth,
  },
});

export const healthRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/_health`,
      validate: false,
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const isEsSecurityEnabled: boolean | null = licenseState.getIsSecurityEnabled();
          const areApiKeysEnabled = await context.alerting.areApiKeysEnabled();
          const alertingFrameworkHeath = await context.alerting.getFrameworkHealth();

          let isSufficientlySecure;
          if (isEsSecurityEnabled === null) {
            isSufficientlySecure = false;
          } else {
            // if isEsSecurityEnabled = true, then areApiKeysEnabled must be true to enable alerting
            // if isEsSecurityEnabled = false, then it does not matter what areApiKeysEnabled is
            isSufficientlySecure =
              !isEsSecurityEnabled || (isEsSecurityEnabled && areApiKeysEnabled);
          }

          const frameworkHealth: AlertingFrameworkHealth = {
            isSufficientlySecure,
            hasPermanentEncryptionKey: encryptedSavedObjects.canEncrypt,
            alertingFrameworkHeath,
          };

          return res.ok({
            body: rewriteBodyRes(frameworkHealth),
          });
        } catch (error) {
          return res.badRequest({ body: error });
        }
      })
    )
  );
};
