/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  TraceSearchQuery,
  TraceSearchType,
} from '../../../../common/trace_explorer';

import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ApmDatePicker } from '../../shared/date_picker/apm_date_picker';
import { fromQuery, toQuery } from '../../shared/links/url_helpers';
import { TraceSearchBox } from './trace_search_box';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { TraceExplorerSamplesFetchContextProvider } from '../../../context/api_fetch_context/trace_explorer_samples_fetch_context';
import { APIClientRequestParamsOf } from '../../../services/rest/create_call_apm_api';
import { TransactionTab } from '../transaction_details/waterfall_with_summary/transaction_tabs';
import { TraceExplorerDistributionChart } from './trace_explorer_distribution_chart';

export function TraceExplorer({ children }: { children: React.ReactElement }) {
  const [query, setQuery] = useState<TraceSearchQuery>({
    query: '',
    type: TraceSearchType.kql,
  });

  const {
    query: urlQuery,
    query: {
      rangeFrom,
      rangeTo,
      environment,
      query: queryFromUrlParams,
      type: typeFromUrlParams,
    },
  } = useApmParams('/traces/explorer');

  const history = useHistory();

  const { start, end } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  useEffect(() => {
    setQuery({
      query: queryFromUrlParams,
      type: typeFromUrlParams,
    });
  }, [queryFromUrlParams, typeFromUrlParams]);

  const routePath = useApmRoutePath();
  const router = useApmRouter();

  const params = useMemo<
    APIClientRequestParamsOf<'GET /internal/apm/traces/find'>['params']
  >(() => {
    return {
      query: {
        start,
        end,
        environment,
        query: queryFromUrlParams,
        type: typeFromUrlParams,
      },
    };
  }, [start, end, environment, queryFromUrlParams, typeFromUrlParams]);

  return (
    <TraceExplorerSamplesFetchContextProvider params={params}>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup direction="row">
            <EuiFlexItem grow>
              <TraceSearchBox
                query={query}
                error={false}
                loading={false}
                onQueryCommit={() => {
                  history.push({
                    ...history.location,
                    search: fromQuery({
                      ...toQuery(history.location.search),
                      query: query.query,
                      type: query.type,
                    }),
                  });
                }}
                onQueryChange={(nextQuery) => {
                  setQuery(nextQuery);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ApmDatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <TraceExplorerDistributionChart />
        </EuiFlexItem>
        <EuiTabs>
          <EuiTab
            isSelected={routePath === '/traces/explorer/waterfall'}
            href={router.link('/traces/explorer/waterfall', {
              query: {
                ...urlQuery,
                traceId: '',
                transactionId: '',
                detailTab: TransactionTab.timeline,
                waterfallItemId: '',
              },
            })}
          >
            {i18n.translate('xpack.apm.traceExplorer.waterfallTab', {
              defaultMessage: 'Waterfall',
            })}
          </EuiTab>
          <EuiTab
            isSelected={routePath === '/traces/explorer/critical-path'}
            href={router.link('/traces/explorer/critical-path', {
              query: urlQuery,
            })}
          >
            {i18n.translate('xpack.apm.traceExplorer.criticalPathTab', {
              defaultMessage: 'Aggregated Critical path',
            })}
          </EuiTab>
        </EuiTabs>
        <EuiSpacer size="s" />
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </TraceExplorerSamplesFetchContextProvider>
  );
}
