/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import styled from 'styled-components';
import { EuiButtonIcon } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import { userAnalyticsConfig } from '../../../../../common/user_analytics';
import { ChartsSyncContextProvider } from '../../../../context/charts_sync_context';
import { asDecimalOrInteger } from '../../../../../common/utils/formatters';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import {
  SegmentWithData,
  useUserAnalyticsSegments,
} from '../../../../hooks/use_user_analytics_segments';
import { px } from '../../../../style/variables';
import { UserAnalyticsSegmentFlyout } from './user_analytics_segment_flyout';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import { LazilyLoadedEQLCodeEditor } from './eql_code_editor/lazily_loaded_code_editor';

const SlotFlexItem = styled(EuiFlexItem)`
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  padding: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const AddSegmentButton = styled(EuiButton)`
  width: 100%;
  text-align: left;
`;

const SlotIcon = styled(EuiFlexItem)`
  width: 16px;
  height: 16px;
`;

const Swatch = styled.div`
  background-color: ${({ color }) => color};
  width: 100%;
  height: 100%;
  border-radius: 2px;
`;

function SegmentSlot({
  title,
  metricName,
  loading,
  color,
  eql,
  onRemove,
  onEdit,
}: {
  title: React.ReactNode;
  metricName: React.ReactNode;
  loading: boolean;
  color: string;
  eql?: string;
  onRemove: () => void;
  onEdit: () => void;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow>
            <EuiText size="s" style={{ fontWeight: 'bold' }}>
              {title}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={i18n.translate(
                'xpack.apm.userAnalyticsChart.editSegmentIconAriaLabel',
                { defaultMessage: 'Edit' }
              )}
              onClick={() => onEdit()}
              iconType="pencil"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={i18n.translate(
                'xpack.apm.userAnalyticsChart.removeSegmentIconAriaLabel',
                { defaultMessage: 'Remove' }
              )}
              onClick={() => onRemove()}
              iconType="crossInACircleFilled"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s">
          <SlotIcon grow={false}>
            {loading ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <Swatch color={color} />
            )}
          </SlotIcon>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{metricName}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {eql ? (
        <EuiFlexItem grow={false}>
          <LazilyLoadedEQLCodeEditor
            value={eql}
            isReadOnly
            width="100%"
            maxLines={5}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

export function UserAnalyticsChart() {
  const {
    segments,
    addSegment,
    removeSegment,
    updateSegment,
  } = useUserAnalyticsSegments();

  const [flyoutState, setFlyoutState] = useState<{
    isOpen: boolean;
    segment: SegmentWithData | null;
  }>({ isOpen: false, segment: null });

  const openFlyout = ({ segment }: { segment: SegmentWithData | null }) => {
    setFlyoutState({
      isOpen: true,
      segment,
    });
  };

  const isChartLoading =
    // at least one segment is still loading
    segments.some(
      (segment) =>
        'status' in segment && segment.status === FETCH_STATUS.LOADING
    ) &&
    // no segments have data
    !segments.some(
      (segment) =>
        'data' in segment && segment.data?.some(({ y }) => y !== null)
    );

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiFlexItem grow>
          <EuiPanel>
            <ChartsSyncContextProvider>
              <TimeseriesChart
                id="userAnalytics"
                timeseries={segments.map((segment) => {
                  return {
                    title: segment.title,
                    color: segment.color,
                    type: 'linemark',
                    data: ('data' in segment && segment.data) || [],
                    yAxis: segment.metric,
                  };
                })}
                fetchStatus={
                  isChartLoading ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS
                }
                yLabelFormat={(y) => asDecimalOrInteger(y)}
              />
            </ChartsSyncContextProvider>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: px(400) }}>
          <EuiPanel>
            <EuiFlexGroup direction="column" gutterSize="s">
              {segments.map((segment) => {
                const { id, title, metric, eql, color } = segment;
                return (
                  <SlotFlexItem key={id}>
                    <SegmentSlot
                      title={title}
                      metricName={userAnalyticsConfig.metrics[metric].title}
                      loading={
                        'status' in segment
                          ? segment.status === FETCH_STATUS.LOADING
                          : false
                      }
                      color={color}
                      eql={eql}
                      onRemove={() => removeSegment(segment)}
                      onEdit={() => {
                        setFlyoutState({
                          isOpen: true,
                          segment,
                        });
                      }}
                    />
                  </SlotFlexItem>
                );
              })}
              <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end' }}>
                <AddSegmentButton
                  iconType="plus"
                  onClick={() => openFlyout({ segment: null })}
                  fill
                >
                  {i18n.translate(
                    'xpack.apm.userAnalytics.addSegmentButtonLabel',
                    {
                      defaultMessage: 'Add segment',
                    }
                  )}
                </AddSegmentButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <UserAnalyticsSegmentFlyout
        isOpen={flyoutState.isOpen}
        onSubmit={(vals) => {
          if (flyoutState.segment) {
            updateSegment({
              ...flyoutState.segment,
              ...vals,
            });
          } else {
            addSegment({
              ...vals,
            });
          }
          return Promise.resolve();
        }}
        onClose={() => {
          setFlyoutState({ segment: null, isOpen: false });
        }}
        segment={flyoutState.segment}
      />
    </>
  );
}
