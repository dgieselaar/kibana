/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  USER_AGENT_NAME,
  TRANSACTION_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Options } from '.';
import { TRANSACTION_PAGE_LOAD } from '../../../../common/transaction_types';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';

export type ESResponse = PromiseReturnType<typeof fetcher>;

export function fetcher(options: Options) {
  const { end, apmEventClient, start, uiFiltersES } = options.setup;
  const {
    serviceName,
    searchAggregatedTransactions,
    transactionName,
  } = options;
  const { intervalString } = getBucketSize(start, end, 'auto');

  const transactionNameFilter = transactionName
    ? [{ term: { [TRANSACTION_NAME]: transactionName } }]
    : [];

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
    { range: rangeFilter(start, end) },
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
    ...uiFiltersES,
    ...transactionNameFilter,
  ];

  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        user_agent_keys: {
          terms: {
            field: USER_AGENT_NAME,
          },
        },
        browsers: {
          date_histogram: {
            extended_bounds: {
              max: end,
              min: start,
            },
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
          },
          aggs: {
            user_agent: {
              terms: {
                field: USER_AGENT_NAME,
              },
              aggs: {
                avg_duration: {
                  avg: {
                    field: getTransactionDurationFieldForAggregatedTransactions(
                      searchAggregatedTransactions
                    ),
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return apmEventClient.search(params);
}
