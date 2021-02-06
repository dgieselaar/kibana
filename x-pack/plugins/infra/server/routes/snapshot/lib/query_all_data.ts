/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { groupBy, sortBy } from 'lodash';
import { MetricsAPIRequest, MetricsAPIResponse } from '../../../../common/http_api';
import { ESSearchClient } from '../../../lib/metrics/types';
import { query } from '../../../lib/metrics';

type Series = MetricsAPIResponse['series'];

const mergeSeries = (previousSeries: Series, series: Series) => {
  const allSeries = [...previousSeries, ...series];

  const allSeriesById = groupBy(allSeries, 'id');

  return Object.keys(allSeriesById).map((id) => {
    const allSeriesForId = allSeriesById[id] as Series;
    const first = allSeriesForId[0];
    return {
      ...first,
      rows: sortBy(
        allSeriesForId.flatMap((idSeries) => idSeries.rows),
        'timestamp'
      ),
    };
  });
};

const handleResponse = (
  client: ESSearchClient,
  options: MetricsAPIRequest,
  previousResponse?: MetricsAPIResponse
) => async (resp: MetricsAPIResponse): Promise<MetricsAPIResponse> => {
  const combinedResponse = previousResponse
    ? {
        ...previousResponse,
        series: mergeSeries(previousResponse.series, resp.series),
        info: resp.info,
      }
    : {
        ...resp,
        series: mergeSeries([], resp.series),
      };
  if (resp.info.afterKey) {
    return query(client, { ...options, afterKey: resp.info.afterKey }).then(
      handleResponse(client, options, combinedResponse)
    );
  }
  return combinedResponse;
};

export const queryAllData = (client: ESSearchClient, options: MetricsAPIRequest) => {
  return query(client, options).then(handleResponse(client, options));
};
