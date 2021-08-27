/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { AlertExecutionStatus, AlertExecutionStatuses } from '../../common/alert';
import type { AlertTaskState } from '../../common/alert_task_instance';
import type { RawAlertExecutionStatus } from '../types';
import { getEsErrorMessage } from './errors/es_error_parser';
import { getReasonFromError } from './error_with_reason';

export function executionStatusFromState(state: AlertTaskState): AlertExecutionStatus {
  const instanceIds = Object.keys(state.alertInstances ?? {});
  return {
    lastExecutionDate: new Date(),
    status: instanceIds.length === 0 ? 'ok' : 'active',
  };
}

export function executionStatusFromError(error: Error): AlertExecutionStatus {
  return {
    lastExecutionDate: new Date(),
    status: 'error',
    error: {
      reason: getReasonFromError(error),
      message: getEsErrorMessage(error),
    },
  };
}

export function alertExecutionStatusToRaw({
  lastExecutionDate,
  status,
  error,
}: AlertExecutionStatus): RawAlertExecutionStatus {
  return {
    lastExecutionDate: lastExecutionDate.toISOString(),
    status,
    // explicitly setting to null (in case undefined) due to partial update concerns
    error: error ?? null,
  };
}

export function alertExecutionStatusFromRaw(
  logger: Logger,
  alertId: string,
  rawAlertExecutionStatus?: Partial<RawAlertExecutionStatus> | null | undefined
): AlertExecutionStatus | undefined {
  if (!rawAlertExecutionStatus) return undefined;

  const { lastExecutionDate, status = 'unknown', error } = rawAlertExecutionStatus;

  let parsedDateMillis = lastExecutionDate ? Date.parse(lastExecutionDate) : Date.now();
  if (isNaN(parsedDateMillis)) {
    logger.debug(
      `invalid alertExecutionStatus lastExecutionDate "${lastExecutionDate}" in raw alert ${alertId}`
    );
    parsedDateMillis = Date.now();
  }

  const parsedDate = new Date(parsedDateMillis);
  if (error) {
    return { lastExecutionDate: parsedDate, status, error };
  } else {
    return { lastExecutionDate: parsedDate, status };
  }
}

export const getAlertExecutionStatusPending = (lastExecutionDate: string) => ({
  status: 'pending' as AlertExecutionStatuses,
  lastExecutionDate,
  error: null,
});
