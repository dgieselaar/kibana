/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';

export const userAnalyticsConfig = {
  index: 'google-analytics-data',
  metrics: {
    users: {
      title: i18n.translate('xpack.apm.userAnalytics.metrics.users', {
        defaultMessage: 'Users',
      }),
      field: 'user.id',
      type: 'cardinality',
    },
    hits: {
      title: i18n.translate('xpack.apm.userAnalytics.metrics.hits', {
        defaultMessage: 'Hits',
      }),
      field: 'session.totals.hits',
      type: 'sum',
    },
    pageLoadTime: {
      title: i18n.translate('xpack.apm.userAnalytics.metrics.pageLoadTime', {
        defaultMessage: 'Page load time',
      }),
      field: 'latencyTracking.pageLoadTime',
      type: 'avg',
    },
    pageViews: {
      title: i18n.translate('xpack.apm.userAnalytics.metrics.pageViews', {
        defaultMessage: 'Page views',
      }),
      field: 'session.totals.pageviews',
      type: 'sum',
    },
    sessions: {
      title: i18n.translate('xpack.apm.userAnalytics.metrics.sessions', {
        defaultMessage: 'Sessions',
      }),
      field: 'session.id',
      type: 'cardinality',
    },
    sessions_per_user: {
      title: i18n.translate('xpack.apm.userAnalytics.metrics.sessionsPerUser', {
        defaultMessage: 'Sessions per user',
      }),
      field: 'session.totals.visits',
      type: 'avg',
    },
    bounces: {
      title: i18n.translate('xpack.apm.userAnalytics.metrics.bounces', {
        defaultMessage: 'Bounces',
      }),
      field: 'session.totals.bounces',
      type: 'sum',
    },
    transactions: {
      title: i18n.translate('xpack.apm.userAnalytics.metrics.transactions', {
        defaultMessage: 'Transactions',
      }),
      field: 'session.totals.transactions',
      type: 'sum',
    },
    revenue: {
      title: i18n.translate('xpack.apm.userAnalytics.metrics.revenue', {
        defaultMessage: 'Revenue',
      }),
      field: 'session.totals.transactionRevenue',
      type: 'sum',
    },
  },
} as const;

export const segmentMetricRt = t.keyof(userAnalyticsConfig.metrics);

export const segmentRt = t.intersection([
  t.type({
    id: t.string,
    title: t.string,
    color: t.string,
    metric: segmentMetricRt,
  }),
  t.partial({
    eql: t.string,
  }),
]);

export type SegmentMetricType = t.TypeOf<typeof segmentMetricRt>;
export type Segment = t.TypeOf<typeof segmentRt>;
