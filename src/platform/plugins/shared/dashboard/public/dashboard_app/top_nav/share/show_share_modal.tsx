/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import React, { ReactElement, useState } from 'react';

import { EuiCallOut, EuiCheckboxGroup } from '@elastic/eui';
import type { Capabilities } from '@kbn/core/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { DashboardPanelMap } from '../../../../common';
import { DashboardLocatorParams } from '../../../dashboard_container/types';
import { getDashboardBackupService } from '../../../services/dashboard_backup_service';
import { coreServices, dataService, shareService } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { shareModalStrings } from '../../_dashboard_app_strings';
import { dashboardUrlParams } from '../../dashboard_router';
import { useShareableUrl } from '../hooks/use_shareable_url';

const showFilterBarId = 'showFilterBar';

export interface ShowShareModalProps {
  isDirty: boolean;
  savedObjectId?: string;
  dashboardTitle?: string;
  anchorElement: HTMLElement;
  getPanelsState: () => DashboardPanelMap;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.dashboard_v2) return false;

  const dashboard = anonymousUserCapabilities.dashboard_v2;

  return !!dashboard.show;
};

export function ShowShareModal({
  isDirty,
  anchorElement,
  savedObjectId,
  dashboardTitle,
  getPanelsState,
}: ShowShareModalProps) {
  const shareableUrl = useShareableUrl({
    getPanelsState,
    savedObjectId,
  });

  if (!shareService) return;

  const EmbedUrlParamExtension = ({
    setParamValue,
  }: {
    setParamValue: (paramUpdate: { [key: string]: boolean }) => void;
  }): ReactElement => {
    const [urlParamsSelectedMap, seturlParamsSelectedMap] = useState<{ [key: string]: boolean }>({
      showFilterBar: true,
    });

    const checkboxes = [
      {
        id: dashboardUrlParams.showTopMenu,
        label: shareModalStrings.getTopMenuCheckbox(),
      },
      {
        id: dashboardUrlParams.showQueryInput,
        label: shareModalStrings.getQueryCheckbox(),
      },
      {
        id: dashboardUrlParams.showTimeFilter,
        label: shareModalStrings.getTimeFilterCheckbox(),
      },
      {
        id: showFilterBarId,
        label: shareModalStrings.getFilterBarCheckbox(),
      },
    ];

    const handleChange = (param: string): void => {
      const newSelectedMap = {
        ...urlParamsSelectedMap,
        [param]: !urlParamsSelectedMap[param],
      };

      const urlParamValues = {
        [dashboardUrlParams.showTopMenu]: newSelectedMap[dashboardUrlParams.showTopMenu],
        [dashboardUrlParams.showQueryInput]: newSelectedMap[dashboardUrlParams.showQueryInput],
        [dashboardUrlParams.showTimeFilter]: newSelectedMap[dashboardUrlParams.showTimeFilter],
        [dashboardUrlParams.hideFilterBar]: !newSelectedMap[showFilterBarId],
      };
      seturlParamsSelectedMap(newSelectedMap);
      setParamValue(urlParamValues);
    };

    return (
      <EuiCheckboxGroup
        options={checkboxes}
        idToSelectedMap={urlParamsSelectedMap}
        onChange={handleChange}
        legend={{
          children: shareModalStrings.getCheckboxLegend(),
        }}
        data-test-subj="embedUrlParamExtension"
      />
    );
  };

  const unsavedStateForLocator: DashboardLocatorParams = {};

  const { dashboardState: unsavedDashboardState } =
    getDashboardBackupService().getState(savedObjectId) ?? {};

  const locatorParams: DashboardLocatorParams = {
    dashboardId: savedObjectId,
    preserveSavedFilters: true,
    refreshInterval: undefined, // We don't share refresh interval externally
    viewMode: 'view', // For share locators we always load the dashboard in view mode
    useHash: false,
    timeRange: dataService.query.timefilter.timefilter.getTime(),
    ...unsavedStateForLocator,
  };

  const allowShortUrl = getDashboardCapabilities().createShortUrl;

  shareService.toggleShareContextMenu({
    isDirty,
    anchorElement,
    allowEmbed: true,
    allowShortUrl,
    shareableUrl,
    objectId: savedObjectId,
    objectType: 'dashboard',
    objectTypeMeta: {
      title: i18n.translate('dashboard.share.shareModal.title', {
        defaultMessage: 'Share this dashboard',
      }),
      config: {
        link: {
          draftModeCallOut: (
            <EuiCallOut
              color="warning"
              data-test-subj="DashboardDraftModeCopyLinkCallOut"
              title={
                <FormattedMessage
                  id="dashboard.share.shareModal.draftModeCallout.title"
                  defaultMessage="Unsaved changes"
                />
              }
            >
              {Boolean(unsavedDashboardState?.panels)
                ? shareModalStrings.getDraftSharePanelChangesWarning()
                : shareModalStrings.getDraftShareWarning('link')}
            </EuiCallOut>
          ),
        },
        embed: {
          draftModeCallOut: (
            <EuiCallOut
              color="warning"
              data-test-subj="DashboardDraftModeEmbedCallOut"
              title={
                <FormattedMessage
                  id="dashboard.share.shareModal.draftModeCallout.title"
                  defaultMessage="Unsaved changes"
                />
              }
            >
              {Boolean(unsavedDashboardState?.panels)
                ? shareModalStrings.getEmbedSharePanelChangesWarning()
                : shareModalStrings.getDraftShareWarning('embed')}
            </EuiCallOut>
          ),
        },
      },
    },
    sharingData: {
      title:
        dashboardTitle ||
        i18n.translate('dashboard.share.defaultDashboardTitle', {
          defaultMessage: 'Dashboard [{date}]',
          values: { date: moment().toISOString(true) },
        }),
      locatorParams: {
        id: DASHBOARD_APP_LOCATOR,
        params: locatorParams,
      },
    },
    embedUrlParamExtensions: [
      {
        paramName: 'embed',
        component: EmbedUrlParamExtension,
      },
    ],
    showPublicUrlSwitch,
    snapshotShareWarning: Boolean(unsavedDashboardState?.panels)
      ? shareModalStrings.getSnapshotShareWarning()
      : undefined,
    toasts: coreServices.notifications.toasts,
  });
}
