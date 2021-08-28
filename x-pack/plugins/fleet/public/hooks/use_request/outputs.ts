/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { outputRoutesService } from '../../../common/services/routes';
import type { GetOutputsResponse, PutOutputRequest } from '../../../common/types/rest_spec/output';

import { sendRequest, useRequest } from './use_request';

export function useGetOutputs() {
  return useRequest<GetOutputsResponse>({
    method: 'get',
    path: outputRoutesService.getListPath(),
  });
}

export function sendPutOutput(outputId: string, body: PutOutputRequest['body']) {
  return sendRequest({
    method: 'put',
    path: outputRoutesService.getUpdatePath(outputId),
    body,
  });
}
