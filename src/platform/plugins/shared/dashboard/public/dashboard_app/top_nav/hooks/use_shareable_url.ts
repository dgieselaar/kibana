/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QueryState } from '@kbn/data-plugin/common';
import { getStateFromKbnUrl, setStateToKbnUrl, unhashUrl } from '@kbn/kibana-utils-plugin/public';
import { omit } from 'lodash';
import { DashboardPanelMap, convertPanelMapToPanelsArray } from '../../../../common';
import { DashboardLocatorParams } from '../../../dashboard_container/types';
import {
  PANELS_CONTROL_GROUP_KEY,
  getDashboardBackupService,
} from '../../../services/dashboard_backup_service';

export function useShareableUrl({
  savedObjectId,
  getPanelsState,
}: {
  savedObjectId?: string;
  getPanelsState: () => DashboardPanelMap;
}) {
  let unsavedStateForLocator: DashboardLocatorParams = {};

  const { dashboardState: unsavedDashboardState, panels: panelModifications } =
    getDashboardBackupService().getState(savedObjectId) ?? {};

  const allUnsavedPanels = (() => {
    if (
      Object.keys(unsavedDashboardState?.panels ?? {}).length === 0 &&
      Object.keys(omit(panelModifications ?? {}, PANELS_CONTROL_GROUP_KEY)).length === 0
    ) {
      // if this dashboard has no modifications or unsaved panels return early. No overrides needed.
      return;
    }

    const latestPanels = getPanelsState();
    // apply modifications to panels.
    const modifiedPanels = panelModifications
      ? Object.entries(panelModifications).reduce((acc, [panelId, unsavedPanel]) => {
          if (unsavedPanel && latestPanels?.[panelId]) {
            acc[panelId] = {
              ...latestPanels[panelId],
              explicitInput: {
                ...latestPanels?.[panelId].explicitInput,
                ...unsavedPanel,
                id: panelId,
              },
            };
          }
          return acc;
        }, {} as DashboardPanelMap)
      : {};

    // The latest state of panels to share. This will overwrite panels from the saved object on Dashboard load.
    const allUnsavedPanelsMap = {
      ...latestPanels,
      ...modifiedPanels,
    };
    return convertPanelMapToPanelsArray(allUnsavedPanelsMap);
  })();

  if (unsavedDashboardState) {
    unsavedStateForLocator = {
      query: unsavedDashboardState.query,
      filters: unsavedDashboardState.filters,
      controlGroupState: panelModifications?.[
        PANELS_CONTROL_GROUP_KEY
      ] as DashboardLocatorParams['controlGroupState'],
      panels: allUnsavedPanels as DashboardLocatorParams['panels'],

      // options
      useMargins: unsavedDashboardState?.useMargins,
      syncColors: unsavedDashboardState?.syncColors,
      syncCursor: unsavedDashboardState?.syncCursor,
      syncTooltips: unsavedDashboardState?.syncTooltips,
      hidePanelTitles: unsavedDashboardState?.hidePanelTitles,
    };
  }

  let _g = getStateFromKbnUrl<QueryState>('_g', window.location.href);
  if (_g?.filters && _g.filters.length === 0) {
    _g = omit(_g, 'filters');
  }
  const baseUrl = setStateToKbnUrl('_g', _g, undefined, window.location.href);

  const shareableUrl = setStateToKbnUrl(
    '_a',
    unsavedStateForLocator,
    { useHash: false, storeInHashQuery: true },
    unhashUrl(baseUrl)
  );

  return shareableUrl;
}
