/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { TruncatedList } from '@kbn/inference-common';

export interface ListDatasetsOptions {
  arguments: {
    start?: number;
    end?: number;
    kql?: string;
    pattern?: string;
  };
  esClient: ElasticsearchClient;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ListDatasetResults = {
  indices: TruncatedList<{
    name: string;
  }>;
  aliases: TruncatedList<{
    name: string;
    indices: string[];
  }>;
  data_streams: TruncatedList<{
    name: string;
    timestamp_field: string;
  }>;
};
