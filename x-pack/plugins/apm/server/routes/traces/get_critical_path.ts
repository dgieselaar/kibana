/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { chunk, last } from 'lodash';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { TRACE_ID } from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';
import { Transaction } from '../../../typings/es_schemas/ui/transaction';
import { Span } from '../../../typings/es_schemas/ui/span';

import { calculateCriticalPath } from './cpa_helper';
import { withApmSpan } from '../../utils/with_apm_span';

const SIZE = 1000;
const MAX_NUM_TRACES = 100;
export async function getCriticalPath({
  setup,
  start,
  end,
  traceIds,
  serviceName,
  transactionName,
}: {
  setup: Setup;
  start: number;
  end: number;
  traceIds: string[];
  serviceName: string;
  transactionName: string;
}) {
  const { apmEventClient } = setup;

  async function getTraceEvents(
    traceIdsInBatch: string[],
    searchAfter?: any[]
  ): Promise<Array<Transaction | Span>> {
    const response = await apmEventClient.search('get_traces', {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      body: {
        size: SIZE,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...termsQuery(TRACE_ID, ...traceIdsInBatch),
            ],
          },
        },
        ...(searchAfter ? { search_after: searchAfter } : {}),
        sort: [
          {
            [TRACE_ID]: 'asc',
          },
        ],
      },
    });

    const hits = response.hits.hits;

    if (hits.length >= SIZE) {
      const nextSearchAfter = last(hits)!.sort!;

      return hits
        .map((hit) => hit._source as Transaction | Span)
        .concat(await getTraceEvents(traceIdsInBatch, nextSearchAfter));
    }

    return hits.map((hit) => hit._source as Transaction | Span);
  }

  const traceIdsSampleSet = traceIds.slice(0, Math.min(MAX_NUM_TRACES, traceIds.length));
  const batches = chunk(traceIdsSampleSet, Math.max(1, traceIdsSampleSet.length / 10));
  const events = (
    await Promise.all(batches.map((batch) => getTraceEvents(batch)))
  ).flat();

  return withApmSpan('calculate_critical_path', async () =>
    calculateCriticalPath(events, serviceName, transactionName)
  );
}
