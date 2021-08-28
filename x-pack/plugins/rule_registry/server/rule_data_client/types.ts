/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApiResponse } from '@elastic/elasticsearch';
import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/api/types';
import type {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../src/core/types/elasticsearch';
import type { FieldDescriptor } from '../../../../../src/plugins/data/server/index_patterns/fetcher/index_patterns_fetcher';
import type { TechnicalRuleDataFieldName } from '../../common/technical_rule_data_field_names';

export interface IRuleDataClient {
  indexName: string;
  isWriteEnabled(): boolean;
  getReader(options?: { namespace?: string }): IRuleDataReader;
  getWriter(options?: { namespace?: string }): IRuleDataWriter;
}

export interface IRuleDataReader {
  search<TSearchRequest extends ESSearchRequest>(
    request: TSearchRequest
  ): Promise<
    ESSearchResponse<Partial<Record<TechnicalRuleDataFieldName, unknown[]>>, TSearchRequest>
  >;

  getDynamicIndexPattern(
    target?: string
  ): Promise<{
    title: string;
    timeFieldName: string;
    fields: FieldDescriptor[];
  }>;
}

export interface IRuleDataWriter {
  bulk(request: BulkRequest): Promise<ApiResponse<BulkResponse>>;
}
