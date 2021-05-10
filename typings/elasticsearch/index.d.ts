/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { estypes } from '@elastic/elasticsearch';
import {
  InferSearchResponseOf,
  AggregateOf as AggregationResultOf,
  SearchHit,
  ESSearchRequestWithValidAggregations,
} from './search';

export type ESFilter = estypes.QueryContainer;
export type ESSearchRequest = estypes.SearchRequest;

export type AggregationOptionsByType = Required<estypes.AggregationContainer>;

// Typings for Elasticsearch queries and aggregations. These are intended to be
// moved to the Elasticsearch JS client at some point (see #77720.)

export type MaybeReadonlyArray<T> = T[] | readonly T[];

export type ESSourceOptions = boolean | string | string[];

export interface ESSearchOptions {
  restTotalHitsAsInt: boolean;
}

export type ESSearchResponse<
  TDocument = unknown,
  TSearchRequest extends ESSearchRequest = ESSearchRequest,
  TOptions extends { restTotalHitsAsInt: boolean } = { restTotalHitsAsInt: false }
> = InferSearchResponseOf<TDocument, TSearchRequest, TOptions>;

export interface ESSearchClient<
  TDocument = unknown,
  TOptions extends { restTotalHitsAsInt: boolean } = { restTotalHitsAsInt: false }
> {
  search<TSearchRequest extends ESSearchRequest>(
    request: TSearchRequest
  ): Promise<ESSearchResponse<TDocument, TSearchRequest, TOptions>>;
}

export {
  InferSearchResponseOf,
  AggregationResultOf,
  SearchHit,
  ESSearchRequestWithValidAggregations,
};
