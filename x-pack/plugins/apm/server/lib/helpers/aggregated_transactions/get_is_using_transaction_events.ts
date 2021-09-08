/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSearchAggregatedTransactions } from '.';
import { kqlQuery, rangeQuery } from '../../../../../observability/server';
import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';
import { ProcessorEvent } from '../../../../common/processor_event';
import type { APMEventClient } from '../create_es_client/create_apm_event_client';
import type { Setup, SetupTimeRange } from '../setup_request';

export async function getIsUsingTransactionEvents({
  setup: { config, start, end, apmEventClient },
  kuery,
}: {
  setup: Setup & Partial<SetupTimeRange>;
  kuery: string;
}): Promise<boolean> {
  const searchAggregatedTransactions =
    config['xpack.apm.searchAggregatedTransactions'];

  if (
    searchAggregatedTransactions === SearchAggregatedTransactionSetting.never
  ) {
    return false;
  }
  if (
    !kuery &&
    searchAggregatedTransactions === SearchAggregatedTransactionSetting.always
  ) {
    return false;
  }

  const searchesAggregatedTransactions = await getSearchAggregatedTransactions({
    config,
    start,
    end,
    apmEventClient,
    kuery,
  });

  if (!searchesAggregatedTransactions) {
    // if no aggregrated transactions, check if any transactions at all
    return await getHasTransactions({
      start,
      end,
      apmEventClient,
      kuery,
    });
  }

  return false;
}

async function getHasTransactions({
  start,
  end,
  apmEventClient,
  kuery,
}: {
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
  kuery: string;
}) {
  const response = await apmEventClient.search('get_has_transactions', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      query: {
        bool: {
          filter: [
            ...(start && end ? rangeQuery(start, end) : []),
            ...kqlQuery(kuery),
          ],
        },
      },
    },
    terminateAfter: 1,
  });

  return response.hits.total.value > 0;
}
