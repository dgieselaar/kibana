/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { omit } from 'lodash';
import type { IRouter } from '../../../../../src/core/server/http/router/router';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../common';
import type { AlertTypeParams, ResolvedSanitizedRule } from '../../common/alert';
import type { ILicenseState } from '../lib/license_state';
import type { AlertingRequestHandlerContext } from '../types';
import type { RewriteResponseCase } from './lib/rewrite_request_case';
import { verifyAccessAndContext } from './lib/verify_access_and_context';

const paramSchema = schema.object({
  id: schema.string(),
});

const rewriteBodyRes: RewriteResponseCase<ResolvedSanitizedRule<AlertTypeParams>> = ({
  alertTypeId,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  apiKeyOwner,
  notifyWhen,
  muteAll,
  mutedInstanceIds,
  executionStatus,
  actions,
  scheduledTaskId,
  ...rest
}) => ({
  ...rest,
  rule_type_id: alertTypeId,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  api_key_owner: apiKeyOwner,
  notify_when: notifyWhen,
  mute_all: muteAll,
  muted_alert_ids: mutedInstanceIds,
  scheduled_task_id: scheduledTaskId,
  execution_status: executionStatus && {
    ...omit(executionStatus, 'lastExecutionDate'),
    last_execution_date: executionStatus.lastExecutionDate,
  },
  actions: actions.map(({ group, id, actionTypeId, params }) => ({
    group,
    id,
    params,
    connector_type_id: actionTypeId,
  })),
});

export const resolveRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_resolve`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = context.alerting.getRulesClient();
        const { id } = req.params;
        const rule = await rulesClient.resolve({ id });
        return res.ok({
          body: rewriteBodyRes(rule),
        });
      })
    )
  );
};
