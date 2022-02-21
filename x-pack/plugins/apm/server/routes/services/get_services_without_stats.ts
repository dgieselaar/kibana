/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../lib/helpers/setup_request';
import { ProcessorEvent } from '../../../common/processor_event';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../observability/server';

export type ServicesItemsSetup = Setup;

export async function getServicesWithoutStats({
  start,
  end,
  setup,
  pageSize,
}: {
  start: number;
  end: number;
  setup: Setup;
  pageSize: number;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.termsEnum(
    'get_services_without_stats',
    {
      apm: {
        events: [
          ProcessorEvent.transaction,
          ProcessorEvent.span,
          ProcessorEvent.metric,
          ProcessorEvent.error,
        ],
      },
      body: {
        field: SERVICE_NAME,
        index_filter: {
          bool: {
            filter: [...rangeQuery(start, end)],
          },
        },
        size: pageSize,
      },
    }
  );

  return response.terms;
}
