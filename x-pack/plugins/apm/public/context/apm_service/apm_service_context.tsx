/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactNode } from 'react';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../common/environment_filter_values';
import { isRumAgentName } from '../../../common/agent_name';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import { useServiceTransactionTypesFetcher } from './use_service_transaction_types_fetcher';
import { useUrlParams } from '../url_params_context/use_url_params';
import { useServiceAgentNameFetcher } from './use_service_agent_name_fetcher';
import { IUrlParams } from '../url_params_context/types';
import { useFetcher } from '../../hooks/use_fetcher';
import { useServiceName } from '../../hooks/use_service_name';
import { APIReturnType } from '../../services/rest/createCallApmApi';

type TopAlerts = APIReturnType<'GET /api/apm/alerts/inventory/top'>;

export const APMServiceContext = createContext<{
  alerts?: TopAlerts;
  agentName?: string;
  transactionType?: string;
  transactionTypes: string[];
}>({ transactionTypes: [] });

export function ApmServiceContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { urlParams } = useUrlParams();
  const { agentName } = useServiceAgentNameFetcher();
  const serviceName = useServiceName()!;
  const { environment, start, end } = urlParams;

  const transactionTypes = useServiceTransactionTypesFetcher();
  const transactionType = getTransactionType({
    urlParams,
    transactionTypes,
    agentName,
  });

  const { data: alerts = [] } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !transactionType) {
        return;
      }

      let kuery = `service.name:${serviceName}`;

      if (environment && environment !== ENVIRONMENT_ALL.value) {
        if (environment === ENVIRONMENT_NOT_DEFINED.value) {
          kuery += ` and not (service.environment:*)`;
        } else {
          kuery += ` and service.environment:"${environment}"`;
        }
      }

      kuery += ` and not (processor.event:transaction) or (processor.event:transaction and transaction.type:${transactionType})`;

      return callApmApi({
        endpoint: 'GET /api/apm/alerts/inventory/top',
        params: {
          query: {
            start,
            end,
            kuery,
          },
        },
      });
    },
    [start, end, serviceName, environment, transactionType],
    { preservePreviousData: false }
  );

  return (
    <APMServiceContext.Provider
      value={{ agentName, alerts, transactionType, transactionTypes }}
      children={children}
    />
  );
}

export function getTransactionType({
  urlParams,
  transactionTypes,
  agentName,
}: {
  urlParams: IUrlParams;
  transactionTypes: string[];
  agentName?: string;
}) {
  if (urlParams.transactionType) {
    return urlParams.transactionType;
  }

  if (!agentName || transactionTypes.length === 0) {
    return;
  }

  // The default transaction type is "page-load" for RUM agents and "request" for all others
  const defaultTransactionType = isRumAgentName(agentName)
    ? TRANSACTION_PAGE_LOAD
    : TRANSACTION_REQUEST;

  // If the default transaction type is not in transactionTypes the first in the list is returned
  return transactionTypes.includes(defaultTransactionType)
    ? defaultTransactionType
    : transactionTypes[0];
}
