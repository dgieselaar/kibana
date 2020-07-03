/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { arrayUnionToCallable } from '../../../../common/utils/array_union_to_callable';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../common/elasticsearch_fieldnames';
import { mergeProjection } from '../../../projections/util/merge_projection';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  ServicesItemsSetup,
  ServicesItemsProjection,
} from './get_services_items';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions/get_use_aggregated_transaction';

const MAX_NUMBER_OF_SERVICES = 500;

const getDeltaAsMinutes = (setup: ServicesItemsSetup) =>
  (setup.end - setup.start) / 1000 / 60;

interface AggregationParams {
  setup: ServicesItemsSetup;
  projection: ServicesItemsProjection;
  useAggregatedTransactions: boolean;
}

export const getTransactionDurationAverages = async ({
  setup,
  projection,
  useAggregatedTransactions,
}: AggregationParams) => {
  const { client } = setup;

  const response = await client.search(
    mergeProjection(projection, {
      apm: {
        types: [
          getProcessorEventForAggregatedTransactions(useAggregatedTransactions),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...projection.body.query.bool.filter,
              ...getDocumentTypeFilterForAggregatedTransactions(
                useAggregatedTransactions
              ),
            ],
          },
        },
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              average: {
                avg: {
                  field: getTransactionDurationFieldForAggregatedTransactions(
                    useAggregatedTransactions
                  ),
                },
              },
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map((bucket) => ({
    serviceName: bucket.key as string,
    avgResponseTime: bucket.average.value,
  }));
};

export const getAgentNames = async ({
  setup,
  projection,
}: AggregationParams) => {
  const { client } = setup;
  const response = await client.search(
    mergeProjection(projection, {
      body: {
        size: 0,
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              agent_name: {
                top_hits: {
                  _source: [AGENT_NAME],
                  size: 1,
                },
              },
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map((bucket) => ({
    serviceName: bucket.key as string,
    agentName: (bucket.agent_name.hits.hits[0]?._source as {
      agent: {
        name: string;
      };
    }).agent.name,
  }));
};

export const getTransactionRates = async ({
  setup,
  projection,
  useAggregatedTransactions,
}: AggregationParams) => {
  const { client } = setup;
  const response = await client.search(
    mergeProjection(projection, {
      apm: {
        types: [
          getProcessorEventForAggregatedTransactions(useAggregatedTransactions),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...projection.body.query.bool.filter,
              ...getDocumentTypeFilterForAggregatedTransactions(
                useAggregatedTransactions
              ),
            ],
          },
        },
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              value_count: {
                value_count: {
                  field: getTransactionDurationFieldForAggregatedTransactions(
                    useAggregatedTransactions
                  ),
                },
              },
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  const deltaAsMinutes = getDeltaAsMinutes(setup);

  return arrayUnionToCallable(aggregations.services.buckets).map((bucket) => {
    const transactionsPerMinute = bucket.value_count.value / deltaAsMinutes;
    return {
      serviceName: bucket.key as string,
      transactionsPerMinute,
    };
  });
};

export const getErrorRates = async ({
  setup,
  projection,
}: AggregationParams) => {
  const { client } = setup;
  const response = await client.search(
    mergeProjection(projection, {
      apm: {
        types: [ProcessorEvent.error],
      },
      body: {
        size: 0,
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  const deltaAsMinutes = getDeltaAsMinutes(setup);

  return aggregations.services.buckets.map((bucket) => {
    const errorsPerMinute = bucket.doc_count / deltaAsMinutes;
    return {
      serviceName: bucket.key as string,
      errorsPerMinute,
    };
  });
};

export const getEnvironments = async ({
  setup,
  projection,
}: AggregationParams) => {
  const { client } = setup;
  const response = await client.search(
    mergeProjection(projection, {
      body: {
        size: 0,
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              environments: {
                terms: {
                  field: SERVICE_ENVIRONMENT,
                },
              },
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map((bucket) => ({
    serviceName: bucket.key as string,
    environments: bucket.environments.buckets.map((env) => env.key as string),
  }));
};
