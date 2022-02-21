/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '../../../../../observability/server';
import {
  AGENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../common/transaction_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { calculateThroughput } from '../../../lib/helpers/calculate_throughput';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { ServicesItemsSetup } from './get_services_items';
import { ProcessorEvent } from '../../../../common/processor_event';
import { maybe } from '../../../../common/utils/maybe';
import { Environment } from '../../../../common/environment_rt';

interface AggregationParams {
  environment: string;
  kuery: string;
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
  maxNumServices: number;
  start: number;
  end: number;
}

export interface TopService {
  serviceName: string;
  transactionType: string | undefined;
  environments: string[];
  agentName: AgentName;
  latency: number | null;
  throughput: number;
  transactionErrorRate: number | null;
}

export async function getServiceTransactionStats({
  environment,
  kuery,
  setup,
  searchAggregatedTransactions,
  maxNumServices,
  start,
  end,
}: AggregationParams): Promise<TopService[]> {
  const { apmEventClient } = setup;

  const outcomes = getOutcomeAggregation();

  const metrics = {
    avg_duration: {
      avg: {
        field: getDurationFieldForTransactions(searchAggregatedTransactions),
      },
    },
    outcomes,
  };

  const response = await apmEventClient.search(
    'get_service_transaction_stats',
    {
      apm: {
        events: [
          ProcessorEvent.error,
          ProcessorEvent.metric,
          getProcessorEventForTransactions(searchAggregatedTransactions),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          services: {
            terms: {
              field: SERVICE_NAME,
              size: maxNumServices,
            },
            aggs: {
              sample: {
                top_metrics: {
                  metrics: [{ field: AGENT_NAME } as const],
                  sort: {
                    '@timestamp': 'desc' as const,
                  },
                },
              },
              txMetrics: {
                filter: {
                  bool: {
                    filter: searchAggregatedTransactions
                      ? getDocumentTypeFilterForTransactions(
                          searchAggregatedTransactions
                        )
                      : termQuery(PROCESSOR_EVENT, ProcessorEvent.transaction),
                  },
                },
                aggs: {
                  transactionType: {
                    terms: {
                      field: TRANSACTION_TYPE,
                    },
                    aggs: {
                      ...metrics,
                      environments: {
                        terms: {
                          field: SERVICE_ENVIRONMENT,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  );

  return (
    response.aggregations?.services.buckets.map((bucket) => {
      const topTransactionTypeBucket =
        bucket.txMetrics.transactionType.buckets.find(
          ({ key }) =>
            key === TRANSACTION_REQUEST || key === TRANSACTION_PAGE_LOAD
        ) ?? maybe(bucket.txMetrics.transactionType.buckets[0]);

      return {
        serviceName: bucket.key as string,
        transactionType: topTransactionTypeBucket?.key as string | undefined,
        environments:
          topTransactionTypeBucket?.environments.buckets.map(
            (environmentBucket) => environmentBucket.key as Environment
          ) ?? [],
        agentName: bucket.sample.top[0].metrics[AGENT_NAME] as AgentName,
        latency: topTransactionTypeBucket?.avg_duration.value ?? null,
        transactionErrorRate: topTransactionTypeBucket
          ? calculateFailedTransactionRate(topTransactionTypeBucket.outcomes)
          : null,
        throughput: topTransactionTypeBucket
          ? calculateThroughput({
              start,
              end,
              value: topTransactionTypeBucket.doc_count,
            })
          : 0,
      };
    }) ?? []
  );
}
