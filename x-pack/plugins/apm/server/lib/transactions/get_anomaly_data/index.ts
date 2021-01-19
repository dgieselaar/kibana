/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { compact, uniqBy, difference } from 'lodash';
import { Logger } from 'src/core/server';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { maybe } from '../../../../common/utils/maybe';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { anomalySeriesFetcher } from './fetcher';
import { getMLJobs } from '../../service_map/get_service_anomalies';
import { ANOMALY_THRESHOLD } from '../../../../../ml/common';

export async function getAnomalySeries({
  serviceName,
  transactionType,
  transactionName,
  setup,
  logger,
}: {
  serviceName: string;
  transactionType: string;
  transactionName?: string;
  setup: Setup & SetupTimeRange;
  logger: Logger;
}) {
  const { start, end, ml } = setup;

  // don't fetch anomalies if the ML plugin is not setup
  if (!ml) {
    return [];
  }

  // don't fetch anomalies if requested for a specific transaction name
  // as ML results are not partitioned by transaction name
  if (!!transactionName) {
    return [];
  }

  // don't fetch anomalies if unknown uiFilters are applied
  const knownFilters = ['environment', 'serviceName'];
  const hasUnknownFiltersApplied = Object.entries(setup.uiFilters)
    .filter(([key, value]) => !!value)
    .map(([key]) => key)
    .some((uiFilterName) => !knownFilters.includes(uiFilterName));

  if (hasUnknownFiltersApplied) {
    return [];
  }

  const { intervalString } = getBucketSize({ start, end });

  // move the start back with one bucket size, to ensure to get anomaly data in the beginning
  // this is required because ML has a minimum bucket size (default is 900s) so if our buckets
  // are smaller, we might have several null buckets in the beginning
  const mlStart = start - 900 * 1000;

  const [anomaliesResponse, jobsInSpace] = await Promise.all([
    anomalySeriesFetcher({
      serviceName,
      transactionType,
      intervalString,
      ml,
      start: mlStart,
      end,
    }),
    getMLJobs(ml.anomalyDetectors),
  ]);

  const allSeries =
    anomaliesResponse?.aggregations?.job_id.buckets.map((bucket) => {
      const dateBuckets = bucket.ml_avg_response_times.buckets;

      return {
        jobId: bucket.key as string,
        anomalyScore: compact(
          dateBuckets.map((dateBucket) => {
            const metrics = maybe(dateBucket.anomaly_score.top[0])?.metrics;
            const score = metrics?.record_score;

            if (
              !metrics ||
              !isFiniteNumber(score) ||
              score < ANOMALY_THRESHOLD.CRITICAL
            ) {
              return null;
            }

            const anomalyStart = Date.parse(metrics.timestamp as string);
            const anomalyEnd =
              anomalyStart + (metrics.bucket_span as number) * 1000;

            return {
              x0: anomalyStart,
              x: anomalyEnd,
              y: score,
            };
          })
        ),
        anomalyBoundaries: dateBuckets
          .filter(
            (dateBucket) =>
              dateBucket.lower.value !== null && dateBucket.upper.value !== null
          )
          .map((dateBucket) => ({
            x: dateBucket.key,
            y0: dateBucket.lower.value as number,
            y: dateBucket.upper.value as number,
          })),
      };
    }) ?? [];

  const seriesWithJobs = compact(
    allSeries.map((series) => {
      const { jobId, ...data } = series;
      const job = jobsInSpace.find((j) => j.job_id === jobId);

      if (!job) {
        return undefined;
      }

      return {
        ...data,
        job: {
          id: job.job_id,
          environment: job.custom_settings?.job_tags?.environment,
        },
      };
    })
  );

  const deduped = uniqBy(seriesWithJobs, (series) => series.job.environment);

  const droppedJobs = difference(seriesWithJobs, deduped).map(
    (series) => series.job.id
  );

  if (droppedJobs.length) {
    logger.warn(`Multiple ML jobs for the same environment found. To guarantee consistent results, make sure there is only one job per environment per space. Dropped results for:
      ${droppedJobs.map((id) => `${id}`).join(', ')}`);
  }

  return deduped;
}
