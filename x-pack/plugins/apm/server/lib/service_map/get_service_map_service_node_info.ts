/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { ESFilter } from '../../../typings/elasticsearch';
import { rangeFilter } from '../../../common/utils/range_filter';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  METRIC_SYSTEM_CPU_PERCENT,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
} from '../../../common/elasticsearch_fieldnames';
import { percentMemoryUsedScript } from '../metrics/by_agent/shared/memory';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
  getDocumentTypeFilterForAggregatedTransactions,
} from '../helpers/aggregated_transactions/get_use_aggregated_transaction';

interface Options {
  setup: Setup & SetupTimeRange;
  environment?: string;
  serviceName: string;
  useAggregatedTransactions: boolean;
}

interface TaskParameters {
  setup: Setup;
  minutes: number;
  filter: ESFilter[];
  useAggregatedTransactions: boolean;
}

export async function getServiceMapServiceNodeInfo({
  serviceName,
  environment,
  setup,
  useAggregatedTransactions,
}: Options & { serviceName: string; environment?: string }) {
  const { start, end } = setup;

  const filter: ESFilter[] = [
    { range: rangeFilter(start, end) },
    { term: { [SERVICE_NAME]: serviceName } },
    ...(environment ? [{ term: { [SERVICE_ENVIRONMENT]: environment } }] : []),
  ];

  const minutes = Math.abs((end - start) / (1000 * 60));

  const taskParams = {
    setup,
    minutes,
    filter,
    useAggregatedTransactions,
  };

  const [
    errorMetrics,
    transactionMetrics,
    cpuMetrics,
    memoryMetrics,
  ] = await Promise.all([
    getErrorMetrics(taskParams),
    getTransactionMetrics(taskParams),
    getCpuMetrics(taskParams),
    getMemoryMetrics(taskParams),
  ]);

  return {
    ...errorMetrics,
    ...transactionMetrics,
    ...cpuMetrics,
    ...memoryMetrics,
  };
}

async function getErrorMetrics({ setup, minutes, filter }: TaskParameters) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      track_total_hits: true,
    },
  });

  return {
    avgErrorsPerMinute:
      response.hits.total.value > 0
        ? response.hits.total.value / minutes
        : null,
  };
}

async function getTransactionMetrics({
  setup,
  filter,
  minutes,
  useAggregatedTransactions,
}: TaskParameters): Promise<{
  avgTransactionDuration: number | null;
  avgRequestsPerMinute: number | null;
}> {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search({
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(useAggregatedTransactions),
      ],
    },
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            ...filter,
            ...getDocumentTypeFilterForAggregatedTransactions(
              useAggregatedTransactions
            ),
          ],
        },
      },
      track_total_hits: true,
      aggs: {
        duration: {
          avg: {
            field: getTransactionDurationFieldForAggregatedTransactions(
              useAggregatedTransactions
            ),
          },
        },
        count: {
          value_count: {
            field: getTransactionDurationFieldForAggregatedTransactions(
              useAggregatedTransactions
            ),
          },
        },
      },
    },
  });

  const totalRequests = response.aggregations?.count.value ?? 0;

  return {
    avgTransactionDuration: response.aggregations?.duration.value ?? null,
    avgRequestsPerMinute: totalRequests > 0 ? totalRequests / minutes : null,
  };
}

async function getCpuMetrics({
  setup,
  filter,
}: TaskParameters): Promise<{ avgCpuUsage: number | null }> {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: filter.concat([
            {
              exists: {
                field: METRIC_SYSTEM_CPU_PERCENT,
              },
            },
          ]),
        },
      },
      aggs: {
        avgCpuUsage: {
          avg: {
            field: METRIC_SYSTEM_CPU_PERCENT,
          },
        },
      },
    },
  });

  return {
    avgCpuUsage: response.aggregations?.avgCpuUsage.value ?? null,
  };
}

async function getMemoryMetrics({
  setup,
  filter,
}: TaskParameters): Promise<{ avgMemoryUsage: number | null }> {
  const { apmEventClient } = setup;
  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: filter.concat([
            {
              exists: {
                field: METRIC_SYSTEM_FREE_MEMORY,
              },
            },
            {
              exists: {
                field: METRIC_SYSTEM_TOTAL_MEMORY,
              },
            },
          ]),
        },
      },
      aggs: {
        avgMemoryUsage: {
          avg: {
            script: percentMemoryUsedScript,
          },
        },
      },
    },
  });

  return {
    avgMemoryUsage: response.aggregations?.avgMemoryUsage.value ?? null,
  };
}
