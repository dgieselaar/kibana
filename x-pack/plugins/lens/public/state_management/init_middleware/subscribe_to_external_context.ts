/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { debounce, isEqual } from 'lodash';
import { delay, finalize, switchMap, tap } from 'rxjs/operators';
import type { LensDispatch, LensGetState } from '..';
import { setState } from '..';
import { waitUntilNextSessionCompletes$ } from '../../../../../../src/plugins/data/public/search/session/session_helpers';
import type { DataPublicPluginStart } from '../../../../../../src/plugins/data/public/types';
import { trackUiEvent } from '../../lens_ui_telemetry/factory';
import { getResolvedDateRange } from '../../utils';

export function subscribeToExternalContext(
  data: DataPublicPluginStart,
  getState: LensGetState,
  dispatch: LensDispatch
) {
  const { query: queryService, search } = data;
  const { filterManager } = queryService;

  const dispatchFromExternal = (searchSessionId = search.session.start()) => {
    const globalFilters = filterManager.getFilters();
    const filters = isEqual(getState().lens.filters, globalFilters)
      ? null
      : { filters: globalFilters };
    dispatch(
      setState({
        searchSessionId,
        ...filters,
        resolvedDateRange: getResolvedDateRange(queryService.timefilter.timefilter),
      })
    );
  };

  const debounceDispatchFromExternal = debounce(dispatchFromExternal, 100);

  const sessionSubscription = search.session
    .getSession$()
    // wait for a tick to filter/timerange subscribers the chance to update the session id in the state
    .pipe(delay(0))
    // then update if it didn't get updated yet
    .subscribe((newSessionId?: string) => {
      if (newSessionId && getState().lens.searchSessionId !== newSessionId) {
        debounceDispatchFromExternal(newSessionId);
      }
    });

  const filterSubscription = filterManager.getUpdates$().subscribe({
    next: () => {
      debounceDispatchFromExternal();
      trackUiEvent('app_filters_updated');
    },
  });

  const timeSubscription = data.query.timefilter.timefilter.getTimeUpdate$().subscribe({
    next: () => {
      debounceDispatchFromExternal();
    },
  });

  const autoRefreshSubscription = data.query.timefilter.timefilter
    .getAutoRefreshFetch$()
    .pipe(
      tap(() => {
        debounceDispatchFromExternal();
      }),
      switchMap((done) =>
        // best way in lens to estimate that all panels are updated is to rely on search session service state
        waitUntilNextSessionCompletes$(search.session).pipe(finalize(done))
      )
    )
    .subscribe();
  return () => {
    filterSubscription.unsubscribe();
    timeSubscription.unsubscribe();
    autoRefreshSubscription.unsubscribe();
    sessionSubscription.unsubscribe();
  };
}
