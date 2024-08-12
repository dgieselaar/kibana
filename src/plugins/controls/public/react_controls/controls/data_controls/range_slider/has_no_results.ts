/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { PublishesDataViews } from '@kbn/presentation-publishing';
import { combineLatest, lastValueFrom, Observable, switchMap, tap } from 'rxjs';
import { ControlFetchContext } from '../../../control_group/control_fetch';
import { ControlGroupApi } from '../../../control_group/types';
import { DataControlApi } from '../types';

export function hasNoResults$({
  controlFetch$,
  data,
  dataViews$,
  rangeFilters$,
  ignoreParentSettings$,
  setIsLoading,
}: {
  controlFetch$: Observable<ControlFetchContext>;
  data: DataPublicPluginStart;
  dataViews$?: PublishesDataViews['dataViews'];
  rangeFilters$: DataControlApi['filters$'];
  ignoreParentSettings$: ControlGroupApi['ignoreParentSettings$'];
  setIsLoading: (isLoading: boolean) => void;
}) {
  let prevRequestAbortController: AbortController | undefined;
  return combineLatest([controlFetch$, rangeFilters$, ignoreParentSettings$]).pipe(
    tap(() => {
      if (prevRequestAbortController) {
        prevRequestAbortController.abort();
        prevRequestAbortController = undefined;
      }
    }),
    switchMap(async ([controlFetchContext, rangeFilters, ignoreParentSettings]) => {
      const dataView = dataViews$?.value?.[0];
      const rangeFilter = rangeFilters?.[0];
      if (!dataView || !rangeFilter || ignoreParentSettings?.ignoreValidations) {
        return false;
      }

      try {
        setIsLoading(true);
        const abortController = new AbortController();
        prevRequestAbortController = abortController;
        return await hasNoResults({
          abortSignal: abortController.signal,
          data,
          dataView,
          rangeFilter,
          ...controlFetchContext,
        });
      } catch (error) {
        // Ignore error, validation is not required for control to function properly
        return false;
      }
    }),
    tap(() => {
      setIsLoading(false);
    })
  );
}

async function hasNoResults({
  abortSignal,
  data,
  dataView,
  filters,
  query,
  rangeFilter,
  timeRange,
}: {
  abortSignal: AbortSignal;
  data: DataPublicPluginStart;
  dataView: DataView;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  rangeFilter: Filter;
  timeRange?: TimeRange;
}): Promise<boolean> {
  const searchSource = await data.search.searchSource.create();
  searchSource.setField('size', 0);
  searchSource.setField('index', dataView);
  // Tracking total hits accurately has a performance cost
  // Setting 'trackTotalHits' to 1 since we just want to know
  // "has no results" or "has results" vs the actual count
  searchSource.setField('trackTotalHits', 1);

  const allFilters = filters ? [...filters] : [];
  allFilters.push(rangeFilter);
  if (timeRange) {
    const timeFilter = data.query.timefilter.timefilter.createFilter(dataView, timeRange);
    if (timeFilter) allFilters.push(timeFilter);
  }
  if (allFilters.length) {
    searchSource.setField('filter', allFilters);
  }

  if (query) {
    searchSource.setField('query', query);
  }

  const resp = await lastValueFrom(
    searchSource.fetch$({
      abortSignal,
      legacyHitsTotal: false,
    })
  );
  const count = (resp?.rawResponse?.hits?.total as estypes.SearchTotalHits)?.value ?? 0;
  return count === 0;
}
