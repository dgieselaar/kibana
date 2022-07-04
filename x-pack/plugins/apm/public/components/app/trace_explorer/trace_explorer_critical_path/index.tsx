/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Chart,
  Datum,
  PartialTheme,
  Partition,
  PartitionElementEvent,
  PartitionLayout,
  PrimitiveValue,
  Settings,
} from '@elastic/charts';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  euiPaletteForStatus,
  EuiText,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { last } from 'lodash';
import { useHistory } from 'react-router-dom';
import { useTraceExplorerSamplesFetchContext } from '../../../../context/api_fetch_context/trace_explorer_samples_fetch_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { Span } from '../../../../../typings/es_schemas/ui/span';
import { asDuration, asPercent } from '../../../../../common/utils/formatters';
import {
  ICriticalPath,
  ICriticalPathItem,
} from '../../../../../typings/critical_path';
import { SampleSizeBadge } from './sample_size_badge';
import { ProcessorEvent } from '../../../../../common/processor_event';
import { getSpanIcon } from '../../../shared/span_icon/get_span_icon';
import { AgentIcon } from '../../../shared/agent_icon';
import { push } from '../../../shared/links/url_helpers';
import { LoadingStatePrompt } from '../../../shared/loading_state_prompt';
import { TraceExplorerCriticalPathFlyout } from './trace_explorer_critical_path_flyout';

const colors = euiPaletteForStatus(130).slice(30, 130);
const maxNumTraces = 100;

const TooltipContainer = euiStyled.div`
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  border-radius: ${(props) => props.theme.eui.euiBorderRadius};
  color: ${(props) => props.theme.eui.euiColorDarkestShade};
  padding: ${(props) => props.theme.eui.euiSizeS};
`;

function CustomTooltip({
  values,
  criticalPath,
  overallValue,
}: {
  criticalPath: ICriticalPath;
  values: Array<{
    color: string;
    label: string;
    value: number;
    formattedValue: string;
  }>;
  overallValue: number;
}) {
  const { value, color } = values[0];

  let label = values[0].label;

  const match = label.match(/(.*?)\s*\|\s*(.*)/);

  let transaction: Transaction | undefined;
  let span: Span | undefined;
  let icon: string = 'dot';
  let duration: number = value;
  let selfDuration: number = value;
  if (match) {
    const [, serviceName, operationName] = match;

    const cpItem = criticalPath.items.find((item) => {
      if (!item.sampleDoc) {
        return false;
      }
      if (item.sampleDoc.service.name !== serviceName) {
        return false;
      }
      if (
        item.sampleDoc.processor.event === ProcessorEvent.transaction &&
        (item.sampleDoc as Transaction).transaction.name !== operationName
      ) {
        return false;
      }

      if (
        item.sampleDoc.processor.event === ProcessorEvent.span &&
        (item.sampleDoc as Span).span.name !== operationName
      ) {
        return false;
      }

      return item.duration.toPrecision(4) === value.toPrecision(4);
    });
    
    const sampleDoc = cpItem?.sampleDoc;
    duration = cpItem?.duration ?? value;
    selfDuration = cpItem?.selfDuration ?? value;
    
    if (sampleDoc?.processor.event === ProcessorEvent.transaction) {
      transaction = sampleDoc as Transaction;
      label = transaction.transaction.name;
      icon = 'merge';
    } else if (sampleDoc?.processor.event === ProcessorEvent.span) {
      span = sampleDoc as Span;
      label = span.span.name;
      icon = getSpanIcon(span.span.type, span.span.subtype);
    }
  }

  return (
    <TooltipContainer>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup
            direction="row"
            alignItems="center"
            gutterSize="s"
            justifyContent="flexStart"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} color={color} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">{label}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {(transaction || span) && (
          <>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>
                  <AgentIcon
                    size="s"
                    agentName={(transaction || span)!.agent.name}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {(transaction || span)!.service.name}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {transaction && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="row" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiBadge>{transaction.transaction.type}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {span && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="row" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiBadge>{span.span.type}</EuiBadge>
                  </EuiFlexItem>
                  {span.span.subtype && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge>{span.span.subtype}</EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {`Duration: ${asDuration(duration)}`}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {`(${asPercent(duration, overallValue)})`}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" >
                    {`Self time:`}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color={color} style={{ fontWeight: 800 }}>
                    {`${asDuration(selfDuration)}`}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color={color} style={{ fontWeight: 800 }}>
                    {`(${asPercent(selfDuration, overallValue)})`}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </>
        )}

      </EuiFlexGroup>
    </TooltipContainer>
  );
}
export function TraceExplorerCriticalPath() {
  const {
    query: {
      rangeFrom,
      rangeTo,
      sampleRangeFrom = 0,
      sampleRangeTo = 0,
      flyoutItemId,
    },
  } = useApmParams('/traces/explorer/critical-path');

  const { data: traceSamplesData, status: traceSamplesFetchStatus } =
    useTraceExplorerSamplesFetchContext();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const history = useHistory();

  const filteredSamples = useMemo(() => {
    return sampleRangeFrom > 0
      ? traceSamplesData?.samples.filter(
          (sample) =>
            sample.duration >= sampleRangeFrom &&
            sample.duration <= sampleRangeTo
        )
      : traceSamplesData?.samples;
  }, [traceSamplesData?.samples, sampleRangeFrom, sampleRangeTo]);

  const { data: criticalPathData, status: criticalPathFetchStatus } =
    useFetcher(
      (callApmApi) => {
        const traceIds = filteredSamples?.map((sample) => sample.traceId);

        if (traceIds === undefined) {
          return undefined;
        }

        if (!traceIds.length) {
          return Promise.resolve({ items: [], sampleSize: 0 });
        }

        return callApmApi('POST /internal/apm/traces/critical_path', {
          params: {
            body: {
              traceIds,
              start,
              end,
              maxNumTraces,
            },
          },
        });
      },
      [start, end, filteredSamples]
    );

  const criticalPath = useMemo(() => {
    return criticalPathData ?? { items: [], sampleSize: 0 };
  }, [criticalPathData]);

  const points = useMemo(() => {
    return criticalPath.items.map((item) => {
      return {
        id: item.hash,
        value: item.selfDuration,
        depth: item.depth,
        layers: item.layers,
      };
    });
  }, [criticalPath]);

  const overallValue =
    criticalPath.items.find((p) => p.depth === 0)?.duration ?? 1;

  const layers = useMemo(() => {
    if (!points.length) {
      return [];
    }

    const itemsById = criticalPath.items.reduce(
      (mapping: Record<string, ICriticalPathItem>, item) => {
        const entry = { [item.hash]: item };
        return { ...mapping, ...entry };
      },
      {}
    );

    const maxDepth = Math.max(...points.map((point) => point.depth));

    return [...new Array(maxDepth + 2)].map((_, depth) => {
      return {
        groupByRollup: (d: Datum) => d.layers[depth],
        nodeLabel: (id: PrimitiveValue) => {
          const item = itemsById[id!];
          if (item) {
            if (item.docType === 'transaction') {
              const transaction = item.sampleDoc as Transaction;
              return `${transaction.service.name} | ${item.name}`;
            } else if (item.docType === 'span') {
              const span = item.sampleDoc as Span;
              return `${span.service.name} | ${item.name}`;
            }

            return item.name;
          }
          return '';
        },
        showAccessor: (id: PrimitiveValue) => !!id,
        shape: {
          fillColor: (d: { dataName: string }) => {
            const value = itemsById[d.dataName].selfDuration;
            const idx = Math.max(
              0,
              (Math.floor((100 * value) / overallValue) % 101) - 1
            );
            return colors[idx];
          },
        },
      };
    });
  }, [points, criticalPath, overallValue]);

  const chartSize = {
    height: layers.length * 15,
    width: '100%',
  };

  const theme = useTheme();
  const chartTheme = useChartTheme();
  const themeOverrides: PartialTheme = {
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    partition: {
      fillLabel: {
        fontFamily: theme.eui.euiCodeFontFamily,
        clipText: true,
      },
      fontFamily: theme.eui.euiCodeFontFamily,
      minFontSize: 9,
      maxFontSize: 9,
    },
  };

  const isLoading =
    traceSamplesFetchStatus === FETCH_STATUS.LOADING ||
    criticalPathFetchStatus === FETCH_STATUS.LOADING ||
    ((filteredSamples?.length ?? 0) > 0 &&
      criticalPathFetchStatus === FETCH_STATUS.NOT_INITIATED);

  if (isLoading) {
    return <LoadingStatePrompt />;
  }

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <SampleSizeBadge sampleSize={criticalPath.sampleSize} />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <Chart size={chartSize}>
            <Settings
              theme={[themeOverrides, ...chartTheme]}
              tooltip={{
                customTooltip: (info) => (
                  <CustomTooltip criticalPath={criticalPath} overallValue={overallValue} {...info} />
                ),
              }}
              onElementClick={(elements) => {
                const clicked = last((elements[0] as PartitionElementEvent)[0]);
                const node = criticalPath.items.find(
                  (item) => item.hash === clicked?.groupByRollup
                );
                push(history, {
                  query: {
                    flyoutItemId:
                      (node?.sampleDoc as Span)?.span?.id ||
                      node?.sampleDoc?.transaction?.id ||
                      '',
                  },
                });
              }}
            />
            <Partition
              id="critical_path_flamegraph"
              data={points}
              layers={layers}
              maxRowCount={1}
              layout={PartitionLayout.icicle}
              valueAccessor={(d: Datum) => d.value as number}
              valueFormatter={() => ''}
            />
          </Chart>
        </EuiFlexItem>
      </EuiFlexGroup>
      <TraceExplorerCriticalPathFlyout
        start={start}
        end={end}
        flyoutItemId={flyoutItemId}
        onFlyoutClose={() => {
          push(history, {
            query: {
              flyoutItemId: '',
            },
          });
        }}
      />
    </>
  );
}
