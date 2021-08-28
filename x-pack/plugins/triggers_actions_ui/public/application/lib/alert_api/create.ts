/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '../../../../../../../src/core/public/http/types';
import type { RewriteResponseCase } from '../../../../../actions/common/rewrite_request_case';
import { BASE_ALERTING_API_PATH } from '../../../../../alerting/common';
import type { Alert, AlertUpdates } from '../../../types';
import { transformAlert } from './common_transformations';

type AlertCreateBody = Omit<
  AlertUpdates,
  'createdBy' | 'updatedBy' | 'muteAll' | 'mutedInstanceIds' | 'executionStatus'
>;
const rewriteBodyRequest: RewriteResponseCase<AlertCreateBody> = ({
  alertTypeId,
  notifyWhen,
  actions,
  ...res
}): any => ({
  ...res,
  rule_type_id: alertTypeId,
  notify_when: notifyWhen,
  actions: actions.map(({ group, id, params }) => ({
    group,
    id,
    params,
  })),
});

export async function createAlert({
  http,
  alert,
}: {
  http: HttpSetup;
  alert: AlertCreateBody;
}): Promise<Alert> {
  const res = await http.post(`${BASE_ALERTING_API_PATH}/rule`, {
    body: JSON.stringify(rewriteBodyRequest(alert)),
  });
  return transformAlert(res);
}
