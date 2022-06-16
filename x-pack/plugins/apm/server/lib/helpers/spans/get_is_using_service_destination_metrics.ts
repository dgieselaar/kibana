/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  METRICSET_NAME,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  SPAN_DURATION,
  SPAN_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../setup_request';

export function getProcessorEventForServiceDestinationStatistics(
  searchServiceDestinationMetrics: boolean
) {
  return searchServiceDestinationMetrics
    ? ProcessorEvent.metric
    : ProcessorEvent.span;
}

export function getDocumentTypeFilterForServiceDestinationStatistics(
  searchServiceDestinationMetrics: boolean
) {
  return searchServiceDestinationMetrics
    ? termQuery(METRICSET_NAME, 'service_destination')
    : [];
}

export function getLatencyFieldForServiceDestinationStatistics(
  searchServiceDestinationMetrics: boolean
) {
  return searchServiceDestinationMetrics
    ? SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM
    : SPAN_DURATION;
}

export function getDocCountFieldForServiceDestinationStatistics(
  searchServiceDestinationMetrics: boolean
) {
  return searchServiceDestinationMetrics
    ? SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT
    : undefined;
}

export async function getIsUsingServiceDestinationMetrics({
  setup,
  useSpanName,
  kuery,
  start,
  end,
}: {
  setup: Setup;
  useSpanName: boolean;
  kuery: string;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  async function getServiceDestinationMetricsCount(
    query?: QueryDslQueryContainer
  ) {
    const response = await apmEventClient.search(
      'get_service_destination_metrics_count',
      {
        apm: {
          events: [getProcessorEventForServiceDestinationStatistics(true)],
        },
        body: {
          size: 1,
          terminate_after: 1,
          query: {
            bool: {
              filter: [
                ...rangeQuery(start, end),
                ...kqlQuery(kuery),
                ...getDocumentTypeFilterForServiceDestinationStatistics(true),
              ],
            },
          },
        },
      }
    );

    return response.hits.total.value;
  }

  if (!useSpanName) {
    return (await getServiceDestinationMetricsCount()) > 0;
  }

  const [
    anyServiceDestinationMetricsCount,
    serviceDestinationMetricsWithoutSpanNameCount,
  ] = await Promise.all([
    getServiceDestinationMetricsCount(),
    getServiceDestinationMetricsCount({
      bool: { must_not: [{ exists: { field: SPAN_NAME } }] },
    }),
  ]);

  return (
    anyServiceDestinationMetricsCount > 0 &&
    serviceDestinationMetricsWithoutSpanNameCount === 0
  );
}
