/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from '../../../../../src/core/server/http/router/router';
import { BASE_ACTION_API_PATH } from '../../common';
import type { RewriteResponseCase } from '../../common/rewrite_request_case';
import type { ILicenseState } from '../lib/license_state';
import type { ActionResult, ActionsRequestHandlerContext } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';

const paramSchema = schema.object({
  id: schema.string(),
});

const rewriteBodyRes: RewriteResponseCase<ActionResult> = ({
  actionTypeId,
  isPreconfigured,
  isMissingSecrets,
  ...res
}) => ({
  ...res,
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_missing_secrets: isMissingSecrets,
});

export const getActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = context.actions.getActionsClient();
        const { id } = req.params;
        return res.ok({
          body: rewriteBodyRes(await actionsClient.get({ id })),
        });
      })
    )
  );
};
