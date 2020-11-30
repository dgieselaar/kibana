/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import {
  segmentMetricRt,
  userAnalyticsConfig,
} from '../../common/user_analytics';
import { UIFilters } from '../../typings/ui_filters';
import { getDynamicIndexPattern } from '../lib/index_pattern/get_dynamic_index_pattern';
import { createRoute } from './create_route';
import { rangeRt, uiFiltersRt } from './default_api_types';
import { getEsFilter } from '../lib/helpers/convert_ui_filters/get_es_filter';
import { getSegmentTimeseries } from '../lib/user_analytics/get_segment_timeseries';
import { createUserAnalyticsClient } from '../lib/user_analytics/create_user_analytics_client';
import { getStaticEQLSuggestions } from '../lib/user_analytics/get_static_eql_suggestions';

export const userAnalyticsDynamicIndexPatternRoute = createRoute({
  endpoint: 'GET /api/apm/user_analytics/dynamic_index_pattern',
  options: {
    tags: ['access:apm'],
  },
  handler: async ({ context }) => {
    return getDynamicIndexPattern({
      context,
      patterns: [userAnalyticsConfig.index],
    });
  },
});

export const userAnalyticsStaticEQLSuggestionsRoute = createRoute({
  endpoint: 'GET /api/apm/user_analytics/static_eql_suggestions',
  options: {
    tags: ['access:apm'],
  },
  handler: async ({ context, request }) => {
    const userAnalyticsClient = createUserAnalyticsClient({
      esClient: context.core.elasticsearch.client,
      debug: context.params.query._debug,
      request,
    });

    return getStaticEQLSuggestions({
      context,
      userAnalyticsClient,
    });
  },
});

export const userAnalyticsSegmentTimeseriesRoute = createRoute({
  endpoint: 'GET /api/apm/user_analytics/segment_timeseries',
  options: {
    tags: ['access:apm'],
  },
  params: t.type({
    query: t.intersection([
      t.type({
        metric: segmentMetricRt,
      }),
      t.partial({
        eql: t.string,
      }),
      rangeRt,
      uiFiltersRt,
    ]),
  }),
  handler: async ({ context, request }) => {
    const {
      metric,
      eql,
      start,
      end,
      uiFilters,
      _debug: debug,
    } = context.params.query;

    return getSegmentTimeseries({
      metric,
      eql,
      start: new Date(start).getTime(),
      end: new Date(end).getTime(),
      esFilter: getEsFilter(JSON.parse(uiFilters) as UIFilters),
      client: createUserAnalyticsClient({
        esClient: context.core.elasticsearch.client,
        debug,
        request,
      }),
    });
  },
});
