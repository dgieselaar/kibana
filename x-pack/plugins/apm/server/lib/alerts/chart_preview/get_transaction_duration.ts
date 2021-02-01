/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryContainer } from '@elastic/elasticsearch/api/types';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { AlertParams } from '../../../routes/alerts/chart_preview';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export async function getTransactionDurationChartPreview({
  alertParams,
  setup,
}: {
  alertParams: AlertParams;
  setup: Setup & SetupTimeRange;
}) {
  const { apmEventClient, start, end } = setup;
  const {
    aggregationType,
    environment,
    serviceName,
    transactionType,
  } = alertParams;

  const query = {
    bool: {
      filter: [
        { range: rangeFilter(start, end) },
        { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
        ...(serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : []),
        ...(transactionType
          ? [{ term: { [TRANSACTION_TYPE]: transactionType } }]
          : []),
        ...getEnvironmentUiFilterES(environment),
      ] as QueryContainer[],
    },
  };

  const { intervalString } = getBucketSize({ start, end, numBuckets: 20 });

  const aggs = {
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: intervalString,
      },
      aggs: {
        duration:
          aggregationType === 'avg'
            ? { avg: { field: TRANSACTION_DURATION } }
            : {
                percentiles: {
                  field: TRANSACTION_DURATION,
                  percents: [aggregationType === '95th' ? 95 : 99],
                },
              },
      },
    },
  };
  const params = {
    apm: { events: [ProcessorEvent.transaction] },
    body: { size: 0, query, aggs },
  };
  const resp = await apmEventClient.search(params);

  if (!resp.aggregations) {
    return [];
  }

  return resp.aggregations.timeseries.buckets.map((bucket) => {
    const percentilesKey = aggregationType === '95th' ? '95.0' : '99.0';
    const x = bucket.key;

    const y =
      'values' in bucket.duration
        ? bucket.duration.values[percentilesKey]
        : bucket.duration.value;

    return { x, y };
  });
}
