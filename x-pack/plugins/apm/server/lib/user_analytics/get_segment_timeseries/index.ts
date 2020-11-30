/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SegmentMetricType } from '../../../../common/user_analytics';

import { ESFilter } from '../../../../../../typings/elasticsearch';
import { UserAnalyticsClient } from '../create_user_analytics_client';
import { getSegmentDataFromEql } from './get_segment_data_from_eql';
import { getSegmentDataFromSearch } from './get_segment_data_from_search';

export interface SegmentTimeseriesParams {
  start: number;
  end: number;
  esFilter: ESFilter[];
  metric: SegmentMetricType;
  eql?: string;
  client: UserAnalyticsClient;
}

export function getSegmentTimeseries(params: SegmentTimeseriesParams) {
  const { eql } = params;

  if (!eql) {
    return getSegmentDataFromSearch(params);
  }

  return getSegmentDataFromEql(params);
}
