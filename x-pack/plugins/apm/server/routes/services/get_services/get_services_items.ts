/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../../lib/helpers/setup_request';
import { getServiceTransactionStats } from './get_service_transaction_stats';

export type ServicesItemsSetup = Setup;

export async function getServicesItems({
  environment,
  kuery,
  setup,
  searchAggregatedTransactions,
  start,
  end,
  pageSize,
}: {
  environment: string;
  kuery: string;
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  pageSize: number;
}) {
  return getServiceTransactionStats({
    environment,
    kuery,
    setup,
    searchAggregatedTransactions,
    maxNumServices: pageSize,
    start,
    end,
  });
}
