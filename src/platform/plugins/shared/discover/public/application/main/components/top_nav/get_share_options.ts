/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { DataView } from '@kbn/data-views-plugin/common';
import { DiscoverAppLocatorParams } from '../../../../../common';
import { DiscoverStateContainer } from '../../state_management/discover_state';
import { DiscoverServices } from '../../../../build_services';

export function getShareOptions({
  services,
  dataView,
  stateContainer,
}: {
  services: DiscoverServices;
  dataView: DataView | undefined;
  stateContainer: DiscoverStateContainer;
}): {
  shareableUrl: string;
  params: DiscoverAppLocatorParams;
} {
  const savedSearch = stateContainer.savedSearchState.getState();
  const filters = services.filterManager.getFilters();
  const appState = stateContainer.appState.getState();
  const { timefilter } = services.data.query.timefilter;
  const timeRange = timefilter.getTime();
  const refreshInterval = timefilter.getRefreshInterval();

  const params: DiscoverAppLocatorParams = {
    ...omit(appState, 'dataSource'),
    ...(savedSearch.id ? { savedSearchId: savedSearch.id } : {}),
    ...(dataView?.isPersisted()
      ? { dataViewId: dataView?.id }
      : { dataViewSpec: dataView?.toMinimalSpec() }),
    filters,
    timeRange,
    refreshInterval,
  };
  const { locator } = services;

  const relativeUrl = locator.getRedirectUrl(params);

  // This logic is duplicated from `relativeToAbsolute` (for bundle size reasons). Ultimately, this should be
  // replaced when https://github.com/elastic/kibana/issues/153323 is implemented.
  const link = document.createElement('a');
  link.setAttribute('href', relativeUrl);
  const shareableUrl = link.href;

  return {
    shareableUrl,
    params,
  };
}
