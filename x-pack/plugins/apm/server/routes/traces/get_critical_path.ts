/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { last } from 'lodash';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { TRACE_ID } from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';
import { Transaction } from '../../../typings/es_schemas/ui/transaction';
import { Span } from '../../../typings/es_schemas/ui/span';

const SIZE = 1000;

export async function getCriticalPath({
  setup,
  start,
  end,
  traceIds,
  maxNumTraces,
}: {
  setup: Setup;
  start: number;
  end: number;
  traceIds: string[];
  maxNumTraces: number;
}) {
  const { apmEventClient } = setup;

  async function getTraceEvents(
    searchAfter?: any[]
  ): Promise<Array<Transaction | Span>> {
    const response = await apmEventClient.search('get_critical_path', {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      body: {
        size: SIZE,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...termsQuery(TRACE_ID, ...traceIds.slice(0, Math.min(maxNumTraces, traceIds.length))),
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
        .concat(await getTraceEvents(nextSearchAfter));
    }

    return hits.map((hit) => hit._source as Transaction | Span);
  }

  const events = await getTraceEvents();

  return events;
}
