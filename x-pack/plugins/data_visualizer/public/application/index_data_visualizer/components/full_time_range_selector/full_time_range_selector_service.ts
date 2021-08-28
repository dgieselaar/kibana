/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { estypes } from '@elastic/elasticsearch';
import moment from 'moment';
import type { Query } from 'src/plugins/data/public';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import type { TimefilterContract } from '../../../../../../../../src/plugins/data/public/query/timefilter/timefilter';
import type { GetTimeFieldRangeResponse } from '../../../../../common/types/time_field_request';
import { isPopulatedObject } from '../../../../../common/utils/object_utils';
import { getTimeFieldRange } from '../../services/time_field_range';

export interface TimeRange {
  from: number;
  to: number;
}

export async function setFullTimeRange(
  timefilter: TimefilterContract,
  indexPattern: IndexPattern,
  query?: Query
): Promise<GetTimeFieldRangeResponse> {
  const runtimeMappings = indexPattern.getComputedFields()
    .runtimeFields as estypes.MappingRuntimeFields;
  const resp = await getTimeFieldRange({
    index: indexPattern.title,
    timeFieldName: indexPattern.timeFieldName,
    query,
    ...(isPopulatedObject(runtimeMappings) ? { runtimeMappings } : {}),
  });
  timefilter.setTime({
    from: moment(resp.start.epoch).toISOString(),
    to: moment(resp.end.epoch).toISOString(),
  });
  return resp;
}

export function getTimeFilterRange(timefilter: TimefilterContract): TimeRange {
  const fromMoment = dateMath.parse(timefilter.getTime().from);
  const toMoment = dateMath.parse(timefilter.getTime().to);
  const from = fromMoment !== undefined ? fromMoment.valueOf() : 0;
  const to = toMoment !== undefined ? toMoment.valueOf() : 0;

  return {
    to,
    from,
  };
}
