/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState, useRef } from 'react';
import { isEqual, omit } from 'lodash';
import { ValuesType } from 'utility-types';
import { FETCH_STATUS } from './useFetcher';
import { callApmApi } from '../services/rest/createCallApmApi';
import { useUrlParams } from './useUrlParams';
import { Segment } from '../../common/user_analytics';
import { UIFilters } from '../../typings/ui_filters';

function getRelevantPropertiesFromSegment({
  segment,
  start,
  end,
  uiFilters,
}: {
  segment: Segment;
  start?: string;
  end?: string;
  uiFilters: UIFilters;
}) {
  const { id, eql, metric } = segment;

  return {
    id,
    eql,
    metric,
    start,
    end,
    uiFilters,
  };
}

export function useUserAnalyticsSegmentsData(segments: Segment[]) {
  const {
    urlParams: { start, end },
    uiFilters,
  } = useUrlParams();

  const [segmentData, setSegmentData] = useState<
    Record<
      string,
      { status: FETCH_STATUS; data?: Array<{ x: number; y: number | null }> }
    >
  >({});

  const newSegmentsToFetch = segments.map((segment) =>
    getRelevantPropertiesFromSegment({ segment, start, end, uiFilters })
  );

  const segmentsToFetch = useRef<Array<ValuesType<typeof newSegmentsToFetch>>>(
    []
  );

  const segmentsToUpdate = newSegmentsToFetch.filter((segment) => {
    const prev = segmentsToFetch.current.find(({ id }) => id === segment.id);

    return !prev || !isEqual(prev, segment);
  });

  const segmentsToRemove = segmentsToFetch.current.filter((segment) => {
    return !segments.some(({ id }) => id === segment.id);
  });

  segmentsToFetch.current = newSegmentsToFetch;

  if (segmentsToUpdate.length || segmentsToRemove.length) {
    setSegmentData((data) => {
      return {
        ...omit(
          data,
          segmentsToRemove.map(({ id }) => id)
        ),
        ...segmentsToUpdate.reduce((prev, segment) => {
          return {
            ...prev,
            [segment.id]: {
              status: FETCH_STATUS.LOADING,
              data: data[segment.id]?.data || undefined,
            },
          };
        }, {}),
      };
    });

    segmentsToUpdate.reduce(async (prev, segment) => {
      await prev;

      try {
        const {
          start: segmentStart,
          end: segmentEnd,
          uiFilters: segmentUiFilters,
          metric,
          eql,
        } = segment;

        const response = await callApmApi({
          endpoint: 'GET /api/apm/user_analytics/segment_timeseries',
          params: {
            query: {
              start: segmentStart!,
              end: segmentEnd!,
              uiFilters: JSON.stringify(segmentUiFilters),
              metric,
              eql,
            },
          },
        });
        setSegmentData((data) => ({
          ...data,
          [segment.id]: {
            status: FETCH_STATUS.SUCCESS,
            data: response,
          },
        }));
      } catch (err) {
        setSegmentData((data) => ({
          ...data,
          [segment.id]: {
            status: FETCH_STATUS.FAILURE,
            data: undefined,
          },
        }));
      }
    }, Promise.resolve());
  }

  return segmentData;
}
