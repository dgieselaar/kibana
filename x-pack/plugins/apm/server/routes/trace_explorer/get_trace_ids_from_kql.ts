/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '../../../../observability/server';
import { TRACE_ID } from '../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../common/environment_rt';
import { ProcessorEvent } from '../../../common/processor_event';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getTraceIdsFromKql({
  apmEventClient,
  query,
  numTraceIds,
  environment,
  start,
  end,
  after,
}: {
  apmEventClient: APMEventClient;
  query: string;
  numTraceIds: number;
  environment: Environment;
  start: number;
  end: number;
  after: Record<string, any> | undefined;
}) {
  const response = await apmEventClient.search('get_trace_ids_from_kql', {
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.span,
        ProcessorEvent.error,
      ],
    },
    body: {
      query: {
        bool: {
          filter: [
            ...kqlQuery(query),
            ...environmentQuery(environment),
            ...rangeQuery(start, end),
            {
              exists: {
                field: TRACE_ID,
              },
            },
          ],
        },
      },
      size: 0,
      aggs: {
        trace_id: {
          composite: {
            sources: asMutableArray([
              { traceId: { terms: { field: TRACE_ID } } },
            ] as const),
            size: numTraceIds,
            ...(after ? { after } : {}),
          },
        },
      },
    },
  });

  const traceIds =
    response.aggregations?.trace_id.buckets.map(
      (bucket) => bucket.key.traceId as string
    ) ?? [];

  return {
    traceIds,
    after: traceIds.length
      ? response.aggregations!.trace_id.after_key
      : undefined,
  };
}
