/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import type { IndexMapping } from '../../../mappings/types';
import type { ISavedObjectTypeRegistry } from '../../../saved_objects_type_registry';
import type { SavedObjectsPitParams } from '../../../types';
import { getPitParams } from './pit_params';
import type { HasReferenceQueryParams, SearchOperator } from './query_params';
import { getQueryParams } from './query_params';
import { getSortingParams } from './sorting_params';

type KueryNode = any;

interface GetSearchDslOptions {
  type: string | string[];
  search?: string;
  defaultSearchOperator?: SearchOperator;
  searchFields?: string[];
  rootSearchFields?: string[];
  searchAfter?: estypes.Id[];
  sortField?: string;
  sortOrder?: estypes.SearchSortOrder;
  namespaces?: string[];
  pit?: SavedObjectsPitParams;
  typeToNamespacesMap?: Map<string, string[] | undefined>;
  hasReference?: HasReferenceQueryParams | HasReferenceQueryParams[];
  hasReferenceOperator?: SearchOperator;
  kueryNode?: KueryNode;
}

export function getSearchDsl(
  mappings: IndexMapping,
  registry: ISavedObjectTypeRegistry,
  options: GetSearchDslOptions
) {
  const {
    type,
    search,
    defaultSearchOperator,
    searchFields,
    rootSearchFields,
    searchAfter,
    sortField,
    sortOrder,
    namespaces,
    pit,
    typeToNamespacesMap,
    hasReference,
    hasReferenceOperator,
    kueryNode,
  } = options;

  if (!type) {
    throw Boom.notAcceptable('type must be specified');
  }

  if (sortOrder && !sortField) {
    throw Boom.notAcceptable('sortOrder requires a sortField');
  }

  return {
    ...getQueryParams({
      registry,
      namespaces,
      type,
      typeToNamespacesMap,
      search,
      searchFields,
      rootSearchFields,
      defaultSearchOperator,
      hasReference,
      hasReferenceOperator,
      kueryNode,
    }),
    ...getSortingParams(mappings, type, sortField, sortOrder),
    ...(pit ? getPitParams(pit) : {}),
    search_after: searchAfter,
  };
}
