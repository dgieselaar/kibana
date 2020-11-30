/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { userAnalyticsConfig } from '../../../../common/user_analytics';

import { APMRequestHandlerContext } from '../../../routes/typings';
import { getDynamicIndexPattern } from '../../index_pattern/get_dynamic_index_pattern';
import { UserAnalyticsClient } from '../create_user_analytics_client';

export async function getStaticEQLSuggestions({
  context,
  userAnalyticsClient,
}: {
  context: APMRequestHandlerContext;
  userAnalyticsClient: UserAnalyticsClient;
}) {
  const getEventTypes = async () => {
    const response = await userAnalyticsClient.search({
      body: {
        timeout: '1ms',
        size: 0,
        aggs: {
          eventCategory: {
            terms: {
              field: 'event.category',
              min_doc_count: 0,
            },
          },
        },
      },
    });

    return (
      response.aggregations?.eventCategory.buckets.map((bucket) =>
        String(bucket.key)
      ) ?? []
    );
  };

  const [indexPattern, eventTypes] = await Promise.all([
    getDynamicIndexPattern({
      context,
      patterns: [userAnalyticsConfig.index],
    }),
    getEventTypes(),
  ]);

  return {
    indexPattern,
    eventTypes,
  };
}
