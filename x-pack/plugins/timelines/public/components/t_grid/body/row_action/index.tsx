/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type {
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../common/search_strategy/timeline/events/all';
import type { TimelineExpandedDetailType } from '../../../../../common/types/timeline';
import { TimelineTabs } from '../../../../../common/types/timeline';
import type {
  ControlColumnProps,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../common/types/timeline/actions';
import type { ColumnHeaderOptions } from '../../../../../common/types/timeline/columns';
import type { OnRowSelected } from '../../../../../common/types/timeline/store';
import * as tGridActions from '../../../../store/t_grid/actions';
import { getMappedNonEcsValue } from '../data_driven_columns';

type Props = EuiDataGridCellValueElementProps & {
  columnHeaders: ColumnHeaderOptions[];
  controlColumn: ControlColumnProps;
  data: TimelineItem[];
  index: number;
  isEventViewer: boolean;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
  width: number;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
};

const RowActionComponent = ({
  columnHeaders,
  controlColumn,
  data,
  index,
  isEventViewer,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  rowIndex,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
  setEventsLoading,
  setEventsDeleted,
  width,
}: Props) => {
  const { data: timelineNonEcsData, ecs: ecsData, _id: eventId, _index: indexName } = useMemo(
    () => data[rowIndex],
    [data, rowIndex]
  );

  const dispatch = useDispatch();

  const columnValues = useMemo(
    () =>
      columnHeaders
        .map(
          (header) =>
            getMappedNonEcsValue({
              data: timelineNonEcsData,
              fieldName: header.id,
            }) ?? []
        )
        .join(' '),
    [columnHeaders, timelineNonEcsData]
  );

  const handleOnEventDetailPanelOpened = useCallback(() => {
    const updatedExpandedDetail: TimelineExpandedDetailType = {
      panelView: 'eventDetail',
      params: {
        eventId,
        indexName: indexName ?? '',
      },
    };

    dispatch(
      tGridActions.toggleDetailPanel({
        ...updatedExpandedDetail,
        tabType,
        timelineId,
      })
    );
  }, [dispatch, eventId, indexName, tabType, timelineId]);

  const Action = controlColumn.rowCellRender;

  if (data.length === 0 || rowIndex >= data.length) {
    return <span data-test-subj="noData" />;
  }

  return (
    <>
      {Action && (
        <Action
          ariaRowindex={rowIndex + 1}
          checked={Object.keys(selectedEventIds).includes(eventId)}
          columnId={controlColumn.id || ''}
          columnValues={columnValues}
          data={timelineNonEcsData}
          data-test-subj="actions"
          ecsData={ecsData}
          eventId={eventId}
          index={index}
          isEventViewer={isEventViewer}
          loadingEventIds={loadingEventIds}
          onEventDetailsPanelOpened={handleOnEventDetailPanelOpened}
          onRowSelected={onRowSelected}
          onRuleChange={onRuleChange}
          rowIndex={rowIndex}
          showCheckboxes={showCheckboxes}
          tabType={tabType}
          timelineId={timelineId}
          width={width}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
        />
      )}
    </>
  );
};

export const RowAction = React.memo(RowActionComponent);
