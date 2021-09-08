/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { withApmSpan } from '../../../utils/with_apm_span';
import type { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getServiceTransactionDetailedStatistics } from './get_service_transaction_detailed_statistics';

export async function getServicesDetailedStatistics({
  serviceNames,
  environment,
  kuery,
  setup,
  searchAggregatedTransactions,
  offset,
}: {
  serviceNames: string[];
  environment: string;
  kuery: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  offset?: string;
}) {
  return withApmSpan('get_service_detailed_statistics', async () => {
    const commonProps = {
      serviceNames,
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceTransactionDetailedStatistics(commonProps),
      offset
        ? getServiceTransactionDetailedStatistics({ ...commonProps, offset })
        : {},
    ]);

    return { currentPeriod, previousPeriod };
  });
}
