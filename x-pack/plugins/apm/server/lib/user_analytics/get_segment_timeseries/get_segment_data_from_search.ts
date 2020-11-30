/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValuesType } from 'utility-types';
import { userAnalyticsConfig } from '../../../../common/user_analytics';
import { rangeFilter } from '../../../../common/utils/range_filter';

import { SegmentTimeseriesParams } from '.';
import { getBucketSize } from '../../helpers/get_bucket_size';

function getSegmentMetricAggregation(
  metric: ValuesType<typeof userAnalyticsConfig.metrics>
) {
  switch (metric.type) {
    case 'avg':
      return {
        avg: {
          field: metric.field,
        },
      };

    case 'sum':
      return {
        sum: {
          field: metric.field,
        },
      };

    case 'cardinality': {
      return {
        cardinality: {
          field: metric.field,
        },
      };
    }
  }
}

export async function getSegmentDataFromSearch({
  client,
  start,
  end,
  esFilter,
  metric,
}: SegmentTimeseriesParams) {
  const { intervalString } = getBucketSize({ start, end, numBuckets: 20 });

  const metricConfig = userAnalyticsConfig.metrics[metric];

  const response = await client.search({
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: rangeFilter(start, end) },
            ...esFilter,
            { exists: { field: metricConfig.field } },
          ],
        },
      },
      aggs: {
        timeseries: {
          date_histogram: {
            fixed_interval: intervalString,
            field: '@timestamp',
            format: 'epoch_millis',
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end,
            },
          },
          aggs: {
            metric: getSegmentMetricAggregation(metricConfig),
          },
        },
      },
    },
  });

  return response.aggregations?.timeseries.buckets.map((bucket) => ({
    x: bucket.key as number,
    y: bucket.metric.value ?? 0,
  }));
}
