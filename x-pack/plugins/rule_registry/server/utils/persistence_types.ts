/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApiResponse } from '@elastic/elasticsearch';
import type { BulkResponse } from '@elastic/elasticsearch/api/types';
import type { Logger } from '@kbn/logging';
import type { ESSearchRequest } from '../../../../../src/core/types/elasticsearch';
import type { AlertTypeParams, AlertTypeState } from '../../../alerting/common/alert';
import type {
  AlertInstanceContext,
  AlertInstanceState,
} from '../../../alerting/common/alert_instance';
import type { IRuleDataClient } from '../rule_data_client/types';
import type { AlertTypeWithExecutor } from '../types';

export type PersistenceAlertService<
  TState extends AlertInstanceState = never,
  TContext extends AlertInstanceContext = never,
  TActionGroupIds extends string = never
> = (
  alerts: Array<{
    id: string;
    fields: Record<string, unknown>;
  }>,
  refresh: boolean | 'wait_for'
) => Promise<ApiResponse<BulkResponse, unknown>>;

export type PersistenceAlertQueryService = (
  query: ESSearchRequest
) => Promise<Array<Record<string, unknown>>>;
export interface PersistenceServices<TAlertInstanceContext extends AlertInstanceContext = {}> {
  alertWithPersistence: PersistenceAlertService<TAlertInstanceContext>;
}

export type CreatePersistenceRuleTypeFactory = (options: {
  ruleDataClient: IRuleDataClient;
  logger: Logger;
}) => <
  TState extends AlertTypeState,
  TParams extends AlertTypeParams,
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TAlertInstanceContext extends AlertInstanceContext = {}
>(
  type: AlertTypeWithExecutor<TState, TParams, TAlertInstanceContext, TServices>
) => AlertTypeWithExecutor<TState, TParams, TAlertInstanceContext, TServices>;
