/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink } from '@elastic/eui';
import React from 'react';
import { UI_SETTINGS } from '../../../../../../../../src/plugins/data/common/constants';
import { ML_PAGES } from '../../../../../../ml/common/constants/locator';
import { useMlHref } from '../../../../../../ml/public/locator/use_ml_href';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import type { TimePickerRefreshInterval } from '../../DatePicker/typings';

interface Props {
  children?: React.ReactNode;
  external?: boolean;
}

export function MLManageJobsLink({ children, external }: Props) {
  const {
    core,
    plugins: { ml },
  } = useApmPluginContext();

  const { urlParams } = useUrlParams();

  const timePickerRefreshIntervalDefaults = core.uiSettings.get<TimePickerRefreshInterval>(
    UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS
  );

  const {
    // hardcoding a custom default of 1 hour since the default kibana timerange of 15 minutes is shorter than the ML interval
    rangeFrom = 'now-1h',
    rangeTo = 'now',
    refreshInterval = timePickerRefreshIntervalDefaults.value,
    refreshPaused = timePickerRefreshIntervalDefaults.pause,
  } = urlParams;

  const mlADLink = useMlHref(ml, core.http.basePath.get(), {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      groupIds: ['apm'],
      globalState: {
        time: { from: rangeFrom, to: rangeTo },
        refreshInterval: { pause: refreshPaused, value: refreshInterval },
      },
    },
  });

  return (
    <EuiLink
      children={children}
      href={mlADLink}
      external={external}
      target={external ? '_blank' : undefined}
    />
  );
}
