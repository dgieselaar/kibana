/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { dataStreamRouteService } from '../../../common/services/routes';
import type { GetDataStreamsResponse } from '../../../common/types/rest_spec/data_stream';

import { useRequest } from './use_request';

export const useGetDataStreams = () => {
  return useRequest<GetDataStreamsResponse>({
    path: dataStreamRouteService.getListPath(),
    method: 'get',
  });
};
