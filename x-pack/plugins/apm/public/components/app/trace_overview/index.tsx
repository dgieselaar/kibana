/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { TraceSearchType } from '../../../../common/trace_explorer';
import { useTraceExplorerEnabledSetting } from '../../../hooks/use_trace_explorer_enabled_setting';
import { Breadcrumb } from '../breadcrumb';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';

const TracesOverviewTitle = i18n.translate(
  'xpack.apm.views.traceOverview.title',
  {
    defaultMessage: 'Traces',
  }
);

export function TraceOverview({ children }: { children: React.ReactElement }) {
  const isTraceExplorerEnabled = useTraceExplorerEnabledSetting();

  const router = useApmRouter();

  const { query } = useApmParams('/traces');

  const routePath = useApmRoutePath();

  const explorerLink = router.link('/traces/explorer', {
    query: {
      comparisonEnabled: query.comparisonEnabled,
      environment: query.environment,
      kuery: query.kuery,
      rangeFrom: query.rangeFrom,
      rangeTo: query.rangeTo,
      offset: query.offset,
      refreshInterval: query.refreshInterval,
      refreshPaused: query.refreshPaused,
      query: '',
      type: TraceSearchType.kql,
      flyoutItemId: '',
    },
  });

  const topTracesLink = router.link('/traces', {
    query: {
      comparisonEnabled: query.comparisonEnabled,
      environment: query.environment,
      kuery: query.kuery,
      rangeFrom: query.rangeFrom,
      rangeTo: query.rangeTo,
      offset: query.offset,
      refreshInterval: query.refreshInterval,
      refreshPaused: query.refreshPaused,
    },
  });

  const tabs = isTraceExplorerEnabled
    ? [
        {
          label: i18n.translate('xpack.apm.traceOverview.topTracesTab', {
            defaultMessage: 'Top traces',
          }),
          href: topTracesLink,
          isSelected: routePath === '/traces',
        },
        {
          label: i18n.translate('xpack.apm.traceOverview.traceExplorerTab', {
            defaultMessage: 'Explorer',
          }),
          href: explorerLink,
          isSelected:
            routePath === '/traces/explorer/critical-path' ||
            routePath === '/traces/explorer/waterfall',
        },
      ]
    : [];

  return (
    <Breadcrumb title={TracesOverviewTitle} href="/traces">
      <ApmMainTemplate
        pageTitle={TracesOverviewTitle}
        pageHeader={{
          tabs,
        }}
      >
        {children}
      </ApmMainTemplate>
    </Breadcrumb>
  );
}
