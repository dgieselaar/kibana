/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  createEsqlWidget,
  GlobalWidgetParameters,
  WidgetRenderAPI,
} from '@kbn/investigate-plugin/public';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { Position } from '@elastic/charts';
import { ErrorRateChart } from '../../components/slo/error_rate_chart';
import { useBurnRateOptions } from '../../pages/slo_details/hooks/use_burn_rate_options';
import { useFetchSloDetails } from '../../hooks/use_fetch_slo_details';
import { InvestigateSloDetailWidgetParameters } from './types';
import { BurnRate } from '../../components/slo/burn_rate/burn_rate';
import { useFetchSloBurnRates } from '../../hooks/use_fetch_slo_burn_rates';
import { getWindowsFromOptions } from '../../components/slo/burn_rate/burn_rates';
import { useHistoricalData } from '../../pages/slo_details/components/historical_data_charts';
import { WideChart } from '../../pages/slo_details/components/wide_chart';
import { EventsChartPanelWithoutFrame } from '../../pages/slo_details/components/events_chart_panel';

function InvestigateSloDetailBurnRateChart({
  slo,
  range,
  threshold,
}: {
  slo: SLOWithSummaryResponse;
  range: {
    from: Date;
    to: Date;
  };
  threshold: number;
}) {
  return (
    <ErrorRateChart
      slo={slo}
      dataTimeRange={range}
      threshold={threshold}
      onBrushed={() => {}}
      selectedTabId="overview"
      height={150}
    />
  );
}

function ChartWithTitle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SloMetaCard({
  slo,
  threshold,
  burnRate,
  isBurnRateLoading,
}: {
  slo: SLOWithSummaryResponse;
  threshold: number;
  burnRate?: number;
  isBurnRateLoading: boolean;
}) {
  const stats = [
    {
      description: i18n.translate('xpack.slo.investigateSloDetail.name', {
        defaultMessage: 'Name',
      }),
      title: slo.name,
    },
    {
      description: i18n.translate('xpack.slo.investigateSloDetail.description', {
        defaultMessage: 'Description',
      }),
      title: slo.description,
    },
    {
      description: i18n.translate('xpack.slo.investigateSloDetail.tags', {
        defaultMessage: 'Tags',
      }),
      title: <TagsList tags={slo.tags} textSize="xs" />,
    },
    {
      description: i18n.translate('xpack.slo.investigateSloDetail.indexPattern', {
        defaultMessage: 'Index pattern',
      }),
      title: <EuiCode>{slo.indicator.params.index}</EuiCode>,
    },
  ];

  return (
    <EuiFlexGroup direction="row" gutterSize="m">
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column" gutterSize="xs">
          {stats.map((stat) => (
            <EuiFlexItem key={stat.description} grow={false}>
              <EuiFlexGroup direction="row">
                <EuiFlexItem grow>
                  <EuiText
                    size="xs"
                    css={css`
                      font-weight: 600;
                    `}
                  >
                    {stat.description}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">{stat.title}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow>
        <BurnRate
          threshold={threshold}
          burnRate={burnRate}
          slo={slo}
          isLoading={isBurnRateLoading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const HISTORICAL_SLI_TITLE = i18n.translate(
  'xpack.slo.investigateSloDetail.historicalSliChartTitle',
  {
    defaultMessage: 'Historical SLI',
  }
);

export function InvestigateSloDetailLoaded({
  start,
  end,
  slo,
}: {
  start: string;
  end: string;
  slo: SLOWithSummaryResponse;
}) {
  const { burnRateOptions } = useBurnRateOptions(slo);

  const [burnRateOption, setBurnRateOption] = useState(burnRateOptions[0]);

  const { isLoading, data } = useFetchSloBurnRates({
    slo,
    shouldRefetch: false,
    windows: getWindowsFromOptions(burnRateOptions),
  });

  useEffect(() => {
    if (burnRateOptions.length) {
      setBurnRateOption(burnRateOptions[0]);
    }
  }, [burnRateOptions]);

  const threshold = burnRateOption.threshold;
  const burnRate = data?.burnRates.find(
    (curr) => curr.name === burnRateOption.windowName
  )?.burnRate;

  const range = useMemo(() => {
    return {
      from: new Date(start),
      to: new Date(end),
    };
  }, [start, end]);

  const { historicalSliData } = useHistoricalData({
    range: undefined,
    slo,
    isAutoRefreshing: false,
  });

  const state =
    slo.summary.status === 'DEGRADING' || slo.summary.status === 'VIOLATED' ? 'error' : 'success';

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <SloMetaCard
          slo={slo}
          threshold={threshold}
          burnRate={burnRate}
          isBurnRateLoading={isLoading}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row">
          <EuiFlexItem grow>
            <ChartWithTitle
              title={i18n.translate('xpack.slo.investigateSloDetail.burnRateChartTitle', {
                defaultMessage: 'Burn rate',
              })}
            >
              <InvestigateSloDetailBurnRateChart threshold={threshold} slo={slo} range={range} />
            </ChartWithTitle>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <ChartWithTitle title={HISTORICAL_SLI_TITLE}>
              <WideChart
                chart="line"
                id={HISTORICAL_SLI_TITLE}
                state={state}
                data={historicalSliData}
                isLoading={isLoading}
                onBrushed={() => {}}
              />
            </ChartWithTitle>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <ChartWithTitle
              title={i18n.translate('xpack.slo.investigateSloDetail.goodVsBadEventsChartTitle', {
                defaultMessage: 'Good vs bad events',
              })}
            >
              <EventsChartPanelWithoutFrame
                slo={slo}
                range={range}
                selectedTabId="overview"
                onBrushed={() => {}}
                legendPosition={Position.Top}
              />
            </ChartWithTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function getQueryAndFiltersFromSlo(slo: SLOWithSummaryResponse) {
  const { filter } = slo.indicator.params;

  if (!filter) {
    return {};
  }

  if (typeof filter === 'string') {
    return {
      query: { query: filter, language: 'kuery' as const },
    };
  }

  const kuery = filter.kqlQuery;

  return {
    ...(kuery ? { query: { query: kuery, language: 'kuery' as const } } : {}),
    filters: filter.filters,
  };
}

export function InvestigateSloDetail({
  filters,
  query,
  timeRange,
  sloId,
  remoteName,
  blocks,
  onWidgetAdd,
}: GlobalWidgetParameters &
  InvestigateSloDetailWidgetParameters &
  Pick<WidgetRenderAPI, 'blocks' | 'onWidgetAdd'>) {
  const { isLoading, data: slo } = useFetchSloDetails({
    sloId,
    remoteName,
    instanceId: undefined,
    shouldRefetch: false,
  });

  const onWidgetAddRef = useRef(onWidgetAdd);

  onWidgetAddRef.current = onWidgetAdd;

  useEffect(() => {
    if (!slo) {
      blocks.publish([]);
      return;
    }

    const predefined = getQueryAndFiltersFromSlo(slo);

    blocks.publish([
      {
        id: 'view_slo_events',
        loading: false,
        content: i18n.translate('xpack.slo.investigateSloDetail.viewGoodAndBadEvents', {
          defaultMessage: 'View good and bad events',
        }),
        onClick: () => {
          onWidgetAddRef.current(
            createEsqlWidget({
              title: i18n.translate('xpack.slo.investigateSloDetail.goodAndBadEventsWidgetTitle', {
                defaultMessage: `Good and bad events for {sloName}`,
                values: {
                  sloName: slo.name,
                },
              }),
              parameters: {
                esql: `FROM ${slo.indicator.params.index}`,
                predefined,
              },
            })
          );
        },
      },
    ]);
  }, [blocks, slo]);

  if (!slo || isLoading) {
    return <EuiLoadingSpinner />;
  }

  return <InvestigateSloDetailLoaded slo={slo} start={timeRange.from} end={timeRange.to} />;
}
