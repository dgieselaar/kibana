/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

enum DatasetSourceType {
  Index = 'index',
  Alias = 'alias',
  DataStream = 'dataStream',
}

export interface OnboardedDataset {
  sourceType: DatasetSourceType;
  name: string;
}

export interface DiscoveredService {
  name: string;
  description: string;
  signals: Array<{
    filter: string;
    indexPattern: string;
  }>;
}
