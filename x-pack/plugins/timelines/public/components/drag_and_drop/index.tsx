/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  draggableIsField,
  fieldWasDroppedOnTimelineColumns,
  IS_DRAGGING_CLASS_NAME,
  IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME,
} from '@kbn/securitysolution-t-grid';
import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import React, { useCallback } from 'react';
import type { BeforeCapture, DropResult } from 'react-beautiful-dnd';
import { DragDropContext } from 'react-beautiful-dnd';
import { useDispatch } from 'react-redux';
import type { BrowserFields } from '../../../common/search_strategy/index_fields';
import type { ColumnHeaderOptions } from '../../../common/types/timeline/columns';
import { useAddToTimelineSensor } from '../../hooks/use_add_to_timeline';
import { addFieldToTimelineColumns, getTimelineIdFromColumnDroppableId } from './helpers';

export * from './draggable_keyboard_wrapper_hook';
export * from './helpers';

interface Props {
  browserFields: BrowserFields;
  defaultsHeader: ColumnHeaderOptions[];
  children: React.ReactNode;
}

const sensors = [useAddToTimelineSensor];

const DragDropContextWrapperComponent: React.FC<Props> = ({
  browserFields,
  defaultsHeader,
  children,
}) => {
  const dispatch = useDispatch();

  const onDragEnd = useCallback(
    (result: DropResult) => {
      try {
        enableScrolling();

        if (fieldWasDroppedOnTimelineColumns(result)) {
          addFieldToTimelineColumns({
            browserFields,
            defaultsHeader,
            dispatch,
            result,
            timelineId: getTimelineIdFromColumnDroppableId(result.destination?.droppableId ?? ''),
          });
        }
      } finally {
        document.body.classList.remove(IS_DRAGGING_CLASS_NAME);

        if (draggableIsField(result)) {
          document.body.classList.remove(IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME);
        }
      }
    },
    [browserFields, defaultsHeader, dispatch]
  );
  return (
    <DragDropContext onDragEnd={onDragEnd} onBeforeCapture={onBeforeCapture} sensors={sensors}>
      {children}
    </DragDropContext>
  );
};

DragDropContextWrapperComponent.displayName = 'DragDropContextWrapperComponent';

export const DragDropContextWrapper = React.memo(
  DragDropContextWrapperComponent,
  // prevent re-renders when data providers are added or removed, but all other props are the same
  (prevProps, nextProps) => deepEqual(prevProps.children, nextProps.children)
);

DragDropContextWrapper.displayName = 'DragDropContextWrapper';

const onBeforeCapture = (before: BeforeCapture) => {
  if (!draggableIsField(before)) {
    document.body.classList.add(IS_DRAGGING_CLASS_NAME);
  }

  if (draggableIsField(before)) {
    document.body.classList.add(IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME);
  }
};

const enableScrolling = () => (window.onscroll = () => noop);
