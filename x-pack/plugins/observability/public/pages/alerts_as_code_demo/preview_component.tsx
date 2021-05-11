/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Axis, Chart, LineSeries, Position, Settings } from '@elastic/charts';
import { EuiTable } from '@elastic/eui';
import datemath from '@elastic/datemath';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useState, useMemo } from 'react';
import { isNumber } from 'lodash';
import { AlertingConfig } from '../../../../apm/common/rules/alerting_dsl/alerting_dsl_rt';
import { useFetcher } from '../../hooks/use_fetcher';
import { callObservabilityApi } from '../../services/call_observability_api';

enum PreviewTab {
  XyChart = 'xyChart',
  Table = 'table',
}

export function PreviewComponent({ config }: { config?: AlertingConfig }) {
  const [preview, setPreview] = useState<
    | {
        start: string;
        end: string;
        config: AlertingConfig;
      }
    | undefined
  >();

  const [time, setTime] = useState<{ start: string; end: string }>({
    start: 'now-1h',
    end: 'now',
  });

  const [selectedTab, setSelectedTab] = useState<string>(PreviewTab.XyChart);

  const { data } = useFetcher(
    ({ signal }) => {
      if (!preview?.config) {
        return;
      }

      const from = datemath.parse(preview.start)?.toDate().getTime();
      const to = datemath.parse(preview.end, { roundUp: true })?.toDate().getTime();

      return callObservabilityApi({
        endpoint: 'POST /api/observability/rules/rule_evaluation_preview',
        params: {
          body: JSON.stringify({
            from,
            to,
            config: preview.config,
          }) as any,
        },
        signal,
      });
    },
    [preview]
  );

  const yMax =
    (data &&
      Math.max(
        ...data.preview.flatMap(({ coordinates }) => {
          return coordinates.map((coord) => (isNumber(coord.y) ? coord.y : 0));
        })
      )) ||
    100;

  const series = useMemo(() => {
    if (!data) {
      return [];
    }
    return (
      data.preview.map(({ labels, metricName, coordinates }, index) => {
        const id = JSON.stringify({ labels, metricName });

        return <LineSeries data={coordinates} id={id} name={id} />;
      }) ?? []
    );
  }, [data]);

  console.log({ series });

  const tabs: EuiTabbedContentTab[] = [
    {
      id: PreviewTab.XyChart,
      name: 'Chart',
      content: (
        <Chart size={{ width: '100%', height: 600 }}>
          <Settings showLegend legendPosition={Position.Bottom} />
          <Axis id="x-axis" position={Position.Bottom} showOverlappingTicks />
          <Axis id="y-axis" position={Position.Left} domain={{ min: 0, max: yMax }} />
          {series}
        </Chart>
      ),
    },
    {
      id: PreviewTab.Table,
      name: 'Table',
      content: <EuiTable style={{ width: '100%', height: 600 }} />,
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiTitle>
          <h3>Preview</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiSpacer size="l" />
      <EuiFlexItem>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween">
          <EuiFlexItem grow style={{ justifyContent: 'center' }}>
            <EuiText>Select the time range over which to preview the rule.</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              css="{ width: 100%; }"
              showUpdateButton={false}
              start={time.start}
              end={time.end}
              onTimeChange={({ start, end }) => {
                setTime({ start, end });
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              disabled={!config}
              onClick={() => {
                if (config) {
                  setPreview({
                    config,
                    ...time,
                  });
                }
              }}
            >
              Preview
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiTabbedContent
                  tabs={tabs}
                  selectedTab={tabs.find((tab) => tab.id === selectedTab)!}
                  onTabClick={(tab) => {
                    setSelectedTab(tab.id);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
