/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  PROCESSOR_EVENT,
  SPAN_ID,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { Maybe } from '../../../typings/common';
import { Span } from '../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../typings/es_schemas/ui/transaction';
import { Setup } from '../../lib/helpers/setup_request';

export interface CriticalPathFlyoutEvents {
  span?: Span;
  transaction?: Transaction;
}

export async function getCriticalPathFlyoutEvents({
  setup,
  start,
  end,
  flyoutItemId,
}: {
  setup: Setup;
  start: number;
  end: number;
  flyoutItemId: string;
}): Promise<CriticalPathFlyoutEvents> {
  const { apmEventClient } = setup;

  let span: Span | undefined;
  let transaction: Transaction | undefined;

  const spanOrTransactionResponse = await apmEventClient.search(
    'get_critical_path_flyout_transaction_or_span',
    {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      body: {
        size: 1,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              {
                bool: {
                  should: [
                    {
                      bool: {
                        filter: [
                          ...termQuery(
                            PROCESSOR_EVENT,
                            ProcessorEvent.transaction
                          ),
                          ...termQuery(TRANSACTION_ID, flyoutItemId),
                        ],
                      },
                    },
                    {
                      bool: {
                        filter: [
                          ...termQuery(PROCESSOR_EVENT, ProcessorEvent.span),
                          ...termQuery(SPAN_ID, flyoutItemId),
                        ],
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      },
    }
  );

  const spanOrTransaction = spanOrTransactionResponse.hits.hits[0]
    ?._source as Maybe<Span | Transaction>;

  if (!spanOrTransaction) {
    return {};
  }

  if (spanOrTransaction.processor.event === ProcessorEvent.span) {
    span = spanOrTransaction as Span;

    const transactionResponse = await apmEventClient.search(
      'get_critical_path_flyout_span_parent',
      {
        apm: {
          events: [ProcessorEvent.transaction],
        },
        body: {
          size: 1,
          query: {
            bool: {
              filter: [
                ...rangeQuery(start, end),
                ...termQuery(PROCESSOR_EVENT, ProcessorEvent.transaction),
                ...termQuery(TRANSACTION_ID, span.transaction!.id),
              ],
            },
          },
        },
      }
    );
    transaction = transactionResponse.hits.hits[0]._source as
      | Transaction
      | undefined;
  } else {
    transaction = spanOrTransaction as Transaction;
  }

  return {
    span,
    transaction,
  };
}
