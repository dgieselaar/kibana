/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { rangeQuery } from '../../../server/utils/queries';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';

export async function getServiceCount({
  setup,
  searchAggregatedTransactions,
}: {
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { apmEventClient, start, end } = setup;

  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: rangeQuery(start, end),
        },
      },
      aggs: { serviceCount: { cardinality: { field: SERVICE_NAME } } },
    },
  };

  const { aggregations } = await apmEventClient.search(
    params,
    'observability_overview_get_service_count'
  );
  return aggregations?.serviceCount.value || 0;
}
