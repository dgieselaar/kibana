/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, termsQuery } from '@kbn/observability-plugin/server';
import {
  EVENT_OUTCOME,
  PARENT_ID,
  TRACE_ID,
} from '../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { EventOutcome } from '../../../common/event_outcome';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';
import { getOverallLatencyDistribution } from '../latency_distribution/get_overall_latency_distribution';
import { OverallLatencyDistributionResponse } from '../latency_distribution/types';

export async function getTracesLatencyDistribution({
  setup,
  start,
  end,
  percentileThreshold,
  traceIds,
}: {
  setup: Setup;
  start: number;
  end: number;
  percentileThreshold: number;
  traceIds: string[];
}): Promise<{
  allTracesDistribution: OverallLatencyDistributionResponse;
  failedTracesDistribution: OverallLatencyDistributionResponse;
}> {
  const commonProps = {
    eventType: ProcessorEvent.transaction,
    setup,
    start,
    end,
    percentileThreshold,
    environment: ENVIRONMENT_ALL.value,
    kuery: '',
  };

  const commonQuery = {
    bool: {
      filter: [
        {
          bool: {
            must_not: {
              exists: {
                field: PARENT_ID,
              },
            },
          },
        },
        ...termsQuery(TRACE_ID, ...traceIds),
      ],
    },
  };

  const [allTracesDistribution, failedTracesDistribution] = await Promise.all([
    getOverallLatencyDistribution({
      ...commonProps,
      query: commonQuery,
    }),
    getOverallLatencyDistribution({
      ...commonProps,
      query: {
        bool: {
          filter: [
            commonQuery,
            ...termQuery(EVENT_OUTCOME, EventOutcome.failure),
          ],
        },
      },
    }),
  ]);

  return {
    allTracesDistribution,
    failedTracesDistribution,
  };
}
