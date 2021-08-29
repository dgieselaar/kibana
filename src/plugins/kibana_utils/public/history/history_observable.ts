/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import deepEqual from 'fast-deep-equal';
import type { Action, History, Location } from 'history';
import type { ParsedQuery } from 'query-string';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { distinctUntilChangedWithInitialValue } from '../../common/distinct_until_changed_with_initial_value';
import { getQueryParams } from './get_query_params';

/**
 * Convert history.listen into an observable
 * @param history - {@link History} instance
 */
export function createHistoryObservable(
  history: History
): Observable<{ location: Location; action: Action }> {
  return new Observable((observer) => {
    const unlisten = history.listen((location, action) => observer.next({ location, action }));
    return () => {
      unlisten();
    };
  });
}

/**
 * Create an observable that emits every time any of query params change.
 * Uses deepEqual check.
 * @param history - {@link History} instance
 */
export function createQueryParamsObservable(history: History): Observable<ParsedQuery> {
  return createHistoryObservable(history).pipe(
    map(({ location }) => ({ ...getQueryParams(location) })),
    distinctUntilChangedWithInitialValue({ ...getQueryParams(history.location) }, deepEqual)
  );
}

/**
 * Create an observable that emits every time _paramKey_ changes
 * @param history - {@link History} instance
 * @param paramKey - query param key to observe
 */
export function createQueryParamObservable<Param = unknown>(
  history: History,
  paramKey: string
): Observable<Param | null> {
  return createQueryParamsObservable(history).pipe(
    map((params) => (params[paramKey] ?? null) as Param | null),
    distinctUntilChangedWithInitialValue(
      (getQueryParams(history.location)[paramKey] ?? null) as Param | null,
      deepEqual
    )
  );
}
