/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Axis, Chart, LineSeries, niceTimeFormatter, Position, Settings } from '@elastic/charts';
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
  EuiTitle,
} from '@elastic/eui';
import React, { useState, useMemo } from 'react';
import { isNumber } from 'lodash';
import { EuiSelect } from '@elastic/eui';
import { AlertingConfig } from '../../../../apm/common/rules/alerting_dsl/alerting_dsl_rt';
import { useFetcher } from '../../hooks/use_fetcher';
import { callObservabilityApi } from '../../services/call_observability_api';
import { EuiTableFieldDataColumnType } from '@elastic/eui';

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

  const [selectedMetric, setSelectedMetric] = useState<string | undefined>();

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
      }).then((response) => {
        const metricNames = [...new Set(response.preview.map(({ metricName }) => metricName))];
        if (!selectedMetric || !metricNames.includes(selectedMetric)) {
          setSelectedMetric(metricNames[0]);
        }
        return response;
      });
    },
    [preview, selectedMetric]
  );

  const allCoordinates =
    data?.preview.flatMap(({ coordinates }) => {
      return coordinates;
    }) ?? [];

  const xCoords = allCoordinates.map((coord) => coord.x);

  const xMin = Math.min(...xCoords);
  const xMax = Math.max(...xCoords);

  const allSeries = useMemo(() => {
    if (!data) {
      return [];
    }

    const labelSets: Record<string, Set<string>> = {};

    data.preview.forEach(({ labels }) => {
      Object.keys(labels).forEach((key) => {
        let set = labelSets[key];
        if (!set) {
          set = labelSets[key] = new Set();
        }
        set.add(labels[key]);
      });
    });

    let uniqueLabels = Object.keys(labelSets).filter((key) => {
      const set = labelSets[key];
      return set.size > 1;
    });

    if (!uniqueLabels.length) {
      uniqueLabels = Object.keys(labelSets).slice(0, 1);
    }

    return (
      data.preview
        .filter((series) => series.metricName === selectedMetric)
        .map(({ labels, coordinates }) => {
          const id = uniqueLabels.map((name) => labels[name]).join('-');

          return {
            data: coordinates,
            id,
            name: id,
          };
        }) ?? []
    );
  }, [data, selectedMetric]);

  const visibleCoordinates = allSeries
    .flatMap((series) => series.data)
    .map((coord) => (isNumber(coord.y) ? coord.y : 0));

  const yMax = Math.max(...visibleCoordinates);

  console.log({
    allSeries,
    yMax,
    xMin,
    xMax,
  });

  const metricNames = [...new Set(data?.preview.map(({ metricName }) => metricName) ?? [])];

  const tableData = allSeries
    .map((series) => {
      const items = series.data.map((item) => {
        return { name: series.name, [selectedMetric ?? '']: item.y, '@timestamp': item.x };
      });
      return items;
    })
    .flat();

  const tableColumns: EuiTableFieldDataColumnType<typeof tableData[0]> = [
    { name: 'name', field: 'name', dataType: 'string' },
    { name: selectedMetric, field: selectedMetric, dataType: 'number' },
    { name: '@timestamp', field: '@timestamp', dataType: 'date' },
  ];

  const tabs: EuiTabbedContentTab[] = [
    {
      id: PreviewTab.XyChart,
      name: 'Chart',
      content: (
        <EuiFlexGroup direction="column" alignItems="flexEnd">
          <EuiSpacer size="s" />
          <EuiFlexItem grow={false} style={{ width: 320 }}>
            <EuiSelect
              prepend="Select metric"
              onChange={(e) => {
                setSelectedMetric(e.target.value);
              }}
              options={
                metricNames.length
                  ? metricNames.map((name) => {
                      return {
                        text: name,
                      };
                    })
                  : [{ disabled: true, text: '...' }]
              }
            />
          </EuiFlexItem>
          <EuiFlexItem style={{ width: '100%' }}>
            <Chart size={{ height: 600 }}>
              <Settings showLegend legendPosition={Position.Bottom} />
              <Axis
                id="x-axis"
                position={Position.Bottom}
                showOverlappingTicks
                tickFormat={niceTimeFormatter([xMin, xMax])}
              />
              <Axis id="y-axis" position={Position.Left} domain={{ min: 0, max: yMax }} />
              {allSeries.map((series) => (
                <LineSeries {...series} key={series.id} />
              ))}
            </Chart>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      id: PreviewTab.Table,
      name: 'Table',
      content: (
        <EuiTable columns={tableColumns} items={tableData} style={{ width: '100%', height: 600 }} />
      ),
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
        <EuiFlexGroup direction="row" justifyContent="flexEnd">
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
