/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { kqlQuery, rangeQuery } from '../../../observability/server';
import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../common/processor_event';
import { SERVICE_NODE_NAME_MISSING } from '../../common/service_nodes';
import { environmentQuery } from '../../common/utils/environment_query';
import type {
  Setup,
  SetupTimeRange,
} from '../../server/lib/helpers/setup_request';

function getServiceNodeNameFilters(serviceNodeName?: string) {
  if (!serviceNodeName) {
    return [];
  }

  if (serviceNodeName === SERVICE_NODE_NAME_MISSING) {
    return [{ bool: { must_not: [{ exists: { field: SERVICE_NODE_NAME } }] } }];
  }

  return [{ term: { [SERVICE_NODE_NAME]: serviceNodeName } }];
}

export function getMetricsProjection({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
}: {
  environment: string;
  kuery: string;
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
}) {
  const { start, end } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...getServiceNodeNameFilters(serviceNodeName),
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ] as QueryDslQueryContainer[];

  return {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      query: {
        bool: {
          filter,
        },
      },
    },
  };
}
