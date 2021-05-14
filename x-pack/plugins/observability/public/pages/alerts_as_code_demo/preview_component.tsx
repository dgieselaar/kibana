/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Axis, Chart, LineSeries, niceTimeFormatter, Position, Settings } from '@elastic/charts';
import datemath from '@elastic/datemath';
import {
  EuiBasicTable,
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { isNumber } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertingConfig } from '../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { useFetcher } from '../../hooks/use_fetcher';
import { callObservabilityApi } from '../../services/call_observability_api';

enum PreviewTab {
  XyChart = 'xyChart',
  Table = 'table',
  JSON = 'json',
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

  useEffect(() => {
    if (config) {
      setPreview({
        config,
        ...time,
      });
    } else {
      setPreview(undefined);
    }
  }, [config, time]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview],
    { preservePreviousData: false }
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

    const uniqueLabels = Object.keys(labelSets).filter((key) => {
      const set = labelSets[key];
      return set.size > 1;
    });

    return (
      data.preview
        .filter((series) => series.metricName === selectedMetric)
        .map(({ labels, coordinates, metricName }) => {
          const id = uniqueLabels.length
            ? uniqueLabels.map((name) => labels[name]).join('-')
            : metricName;

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

  const metricNames = [...new Set(data?.preview.map(({ metricName }) => metricName) ?? [])];

  const tableData = allSeries
    .map((series) => {
      const items = series.data.map((item) => {
        return { name: series.name, [selectedMetric ?? '']: item.y, '@timestamp': item.x };
      });
      return items;
    })
    .flat();

  const tableColumns: Array<EuiTableFieldDataColumnType<typeof tableData[0]>> = [
    { name: 'name', field: 'name', dataType: 'string' },
    { name: selectedMetric, field: selectedMetric ?? '', dataType: 'number' },
    { name: '@timestamp', field: '@timestamp', dataType: 'date' },
  ];

  const tabs: EuiTabbedContentTab[] = [
    {
      id: PreviewTab.XyChart,
      // @ts-ignore
      disabled: !config,
      name: 'Chart',
      content: (
        <EuiFlexGroup direction="column" alignItems="flexEnd" style={{ opacity: config ? 1 : 0 }}>
          <EuiSpacer size="s" />
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
      // @ts-ignore
      disabled: !config,
      name: 'Table',
      content: selectedMetric ? (
        <EuiBasicTable
          columns={tableColumns}
          items={tableData}
          style={{ width: '100%', height: 600 }}
        />
      ) : (
        <></>
      ),
    },
    {
      id: PreviewTab.JSON,
      // @ts-ignore
      disabled: !config,
      name: 'JSON',
      content: (
        <>
          <EuiSpacer />
          <EuiCodeBlock isCopyable={true} language="json">
            {JSON.stringify(config, null, 2)}
          </EuiCodeBlock>
        </>
      ),
    },
  ];

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiSuperDatePicker
              isDisabled={!config}
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
            <EuiSelect
              disabled={metricNames.length === 0}
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
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={!config}
              color="primary"
              fill={true}
              iconType="refresh"
              onClick={() => {
                if (config) {
                  setPreview({
                    config,
                    ...time,
                  });
                }
              }}
            >
              Refresh
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
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
  );
}
