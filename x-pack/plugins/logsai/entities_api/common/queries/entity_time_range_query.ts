/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export function entityTimeRangeQuery(start: number, end: number): QueryDslQueryContainer[] {
  return [
    {
      range: {
        'entity.lastSeenTimestamp': {
          gte: start,
        },
      },
    },
    {
      range: {
        'entity.firstSeenTimestamp': {
          lte: end,
        },
      },
    },
  ];
}
