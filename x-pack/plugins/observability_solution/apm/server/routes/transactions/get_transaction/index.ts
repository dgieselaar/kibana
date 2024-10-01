/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  isElasticApmSource,
  unflattenKnownApmEventFields,
} from '@kbn/apm-data-access-plugin/server';
import {
  AGENT_EPHEMERAL_ID,
  AGENT_NAME,
  AGENT_VERSION,
  AT_TIMESTAMP,
  PROCESSOR_EVENT,
  PROCESSOR_NAME,
  SERVICE_NAME,
  TIMESTAMP,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { maybe } from '../../../../common/utils/maybe';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';

export async function getTransaction({
  transactionId,
  traceId,
  apmEventClient,
  start,
  end,
}: {
  transactionId: string;
  traceId?: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<Transaction | undefined> {
  const resp = await apmEventClient.search('get_transaction', {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.TransactionEvent,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: asMutableArray([
            { term: { [TRANSACTION_ID]: transactionId } },
            ...termQuery(TRACE_ID, traceId),
            ...rangeQuery(start, end),
          ]),
        },
      },
      fields: [{ field: '*', include_unmapped: true }],
      _source: ['transaction.agent.marks', 'span.links'],
    },
  });

  const hit = maybe(resp.hits.hits[0]);

  if (hit) {
    const requiredFields = asMutableArray([
      TRACE_ID,
      TRANSACTION_ID,
      AGENT_NAME,
      PROCESSOR_EVENT,
      AT_TIMESTAMP,
      TIMESTAMP,
      SERVICE_NAME,
      AGENT_VERSION,
      AGENT_EPHEMERAL_ID,
      TRANSACTION_DURATION,
      TRANSACTION_NAME,
      TRANSACTION_SAMPLED,
      TRANSACTION_TYPE,
      PROCESSOR_NAME,
    ] as const);

    const event = unflattenKnownApmEventFields(hit.fields, requiredFields);

    const source = isElasticApmSource(hit._source)
      ? (hit._source as {
          transaction: Pick<Transaction['transaction'], 'marks'>;
          span?: Pick<Required<Transaction>['span'], 'links'>;
        })
      : undefined;

    const tx: Transaction = {
      ...event,
      transaction: {
        ...event.transaction,
        marks: source?.transaction.marks,
      },
      processor: {
        name: 'transaction',
        event: 'transaction',
      },
      span: source?.span,
    };

    return tx;
  }
  return undefined;
}
