/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocalStorage } from './use_local_storage';

export interface ExtractedService {
  id: string;
  name: string;
  description?: string;
  sources: Array<{ dataset: string; filter?: string }>;
  visualizations?: Array<{
    title: string;
    description: string;
    esql: string;
  }>;
}

export function useExtractedServices() {
  return useLocalStorage<ExtractedService[]>('observability.dataOnboarding.extractedServices', []);
}
