/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { LATEST_ENTITIES_INDEX, type Entity } from '../../../common/entities';
import { esqlResultToPlainObjects } from '../../../common/utils/esql_result_to_plain_objects';
import { toEntity } from '../../../common/utils/to_entity';

export async function getEntityById({
  esClient,
  type,
  displayName,
}: {
  esClient: ObservabilityElasticsearchClient;
  type: string;
  displayName: string;
}): Promise<Entity & { _source: Record<string, any> }> {
  const response = await esClient.esql('get_entity', {
    query: `FROM ${LATEST_ENTITIES_INDEX} METADATA _source | WHERE entity.type == "${type}" AND entity.displayName.keyword == "${displayName}" | LIMIT 1`,
  });

  if (response.values.length === 0) {
    throw notFound();
  }

  const { _source, ...result } = esqlResultToPlainObjects(response)[0];

  return {
    ...toEntity(result),
    _source,
  };
}
