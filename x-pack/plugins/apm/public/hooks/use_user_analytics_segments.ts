/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { useHistory } from 'react-router-dom';
import { omit } from 'lodash';
import { ValuesType } from 'utility-types';
import {
  // @ts-expect-error
  euiPaletteColorBlind,
} from '@elastic/eui/lib/services';
import { v4 } from 'uuid';
import { jsonRt } from '../../common/runtime_types/json_rt';
import {
  Segment,
  segmentRt,
  userAnalyticsConfig,
} from '../../common/user_analytics';
import { useUrlParams } from './useUrlParams';
import { fromQuery, toQuery } from '../components/shared/Links/url_helpers';
import { useUserAnalyticsSegmentsData } from './use_user_analytics_segments_data';
import { maybe } from '../../common/utils/maybe';

const urlSegmentRt = jsonRt.pipe(t.array(segmentRt));

function parseUrlSegments({ segments }: { segments: string }) {
  const result = urlSegmentRt.decode(segments);

  if (isRight(result)) {
    return result.right;
  }

  return [
    {
      id: 'users',
      title: userAnalyticsConfig.metrics.users.title,
      metric: 'users' as const,
      color: euiPaletteColorBlind()[0],
    },
  ];
}

export function useUserAnalyticsSegments() {
  const {
    urlParams: { segments: urlSegments },
  } = useUrlParams();

  const history = useHistory();

  const segments: Segment[] = parseUrlSegments({
    segments: urlSegments ?? '',
  });

  const segmentData = useUserAnalyticsSegmentsData(segments);

  const updateUrl = (newSegments: Segment[]) => {
    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        segments: urlSegmentRt.encode(
          newSegments.map((segment) => omit(segment, 'status', 'data'))
        ),
      }),
    });
  };

  return {
    segments: segments.map((segment) => ({
      ...segment,
      ...maybe(segmentData[segment.id]),
    })),
    addSegment: (segment: Omit<Segment, 'id' | 'color'>) => {
      const id = v4();
      const palette: string[] = euiPaletteColorBlind();
      const pickedColors = segments.map(({ color }) => color);
      const availableColors = palette.filter(
        (color) => !pickedColors.includes(color)
      );
      const color = availableColors[0] ?? palette[0];

      updateUrl(segments.concat({ id, color, ...segment }));
    },
    removeSegment: (segment: Segment) => {
      updateUrl(segments.filter((seg) => seg.id !== segment.id));
    },
    updateSegment: (segment: Segment) => {
      updateUrl(
        segments.map((seg) => {
          return seg.id === segment.id ? segment : seg;
        })
      );
    },
  };
}

export type SegmentWithData = ValuesType<
  ReturnType<typeof useUserAnalyticsSegments>['segments']
>;
