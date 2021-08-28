/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import type {
  GlobalSearchProviderFindOptions,
  GlobalSearchProviderFindParams,
  GlobalSearchProviderResult,
} from '../common/types';
import type { SearchServiceSetup, SearchServiceStart } from './services/search_service';

export type GlobalSearchPluginSetup = Pick<SearchServiceSetup, 'registerResultProvider'>;
export type GlobalSearchPluginStart = Pick<SearchServiceStart, 'find' | 'getSearchableTypes'>;

/**
 * GlobalSearch result provider, to be registered using the {@link GlobalSearchPluginSetup | global search API}
 */
export interface GlobalSearchResultProvider {
  /**
   * id of the provider
   */
  id: string;
  /**
   * Method that should return an observable used to emit new results from the provider.
   *
   * See {@GlobalSearchProviderResult | the result type} for the expected result structure.
   *
   * @example
   * ```ts
   * // returning all results in a single batch
   * setupDeps.globalSearch.registerResultProvider({
   *   id: 'my_provider',
   *   find: ({ term, filters }, { aborted$, preference, maxResults }, context) => {
   *     const resultPromise = myService.search(term, { preference, maxResults }, context.core.savedObjects.client);
   *     return from(resultPromise).pipe(takeUntil(aborted$));
   *   },
   * });
   * ```
   */
  find(
    search: GlobalSearchProviderFindParams,
    options: GlobalSearchProviderFindOptions
  ): Observable<GlobalSearchProviderResult[]>;

  /**
   * Method that should return all the possible {@link GlobalSearchProviderResult.type | type} of results that
   * this provider can return.
   */
  getSearchableTypes: () => string[] | Promise<string[]>;
}
