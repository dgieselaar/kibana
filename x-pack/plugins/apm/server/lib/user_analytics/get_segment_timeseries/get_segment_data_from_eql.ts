/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get, uniq, sum, mean } from 'lodash';
import { userAnalyticsConfig } from '../../../../common/user_analytics';
import { SegmentTimeseriesParams } from '.';
import { getBucketSize } from '../../helpers/get_bucket_size';

export async function getSegmentDataFromEql({
  start,
  end,
  metric,
  eql,
  client,
  esFilter,
}: SegmentTimeseriesParams) {
  const bucketSize =
    getBucketSize({ start, end, numBuckets: 20 }).bucketSize * 1000;

  const metricConfig = userAnalyticsConfig.metrics[metric];

  if (!bucketSize || bucketSize <= 0) {
    return [];
  }

  const ranges: Array<{ from: number; to: number }> = [];

  let at = start;
  while ((at += bucketSize) <= end) {
    ranges.push({
      from: at - bucketSize,
      to: at,
    });
  }

  const buckets = await Promise.all(
    ranges.slice(0, 1).map(async (range) => {
      const response = await client.eql.search({
        filter: {
          bool: {
            filter: [
              ...esFilter,
              {
                range: {
                  'session.time.start': {
                    gte: range.from,
                    lt: range.to,
                    format: 'epoch_millis',
                  },
                },
              },
            ],
          },
        },
        timestamp_field: '@timestamp',
        tiebreaker_field: 'hit.seq',
        event_category_field: 'event.category',
        query: eql!,
        size: 5000,
        fetch_size: 10000,
      });

      const events = response.hits.sequences.flatMap(
        (sequence) => sequence.events
      );

      const values = events
        .map(
          (event) =>
            get(event._source, metricConfig.field) as
              | string
              | number
              | undefined
        )
        .filter((value) => value !== undefined);

      let y: number | null;

      switch (metricConfig.type) {
        case 'cardinality':
          y = uniq(values).length;
          break;

        case 'sum':
          y = sum(values.map((val) => Number(val)));
          break;

        case 'avg':
          y = mean(values.map((val) => Number(val)));
          break;
      }

      return {
        x: range.from,
        y,
      };
    })
  );

  return buckets;
}
