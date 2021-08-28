/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fleetSetupRouteService, setupRouteService } from '../../../common/services/routes';
import type { GetFleetStatusResponse } from '../../../common/types/rest_spec/fleet_setup';

import { sendRequest } from './use_request';

export const sendSetup = () => {
  return sendRequest({
    path: setupRouteService.getSetupPath(),
    method: 'post',
  });
};

export const sendGetFleetStatus = () => {
  return sendRequest<GetFleetStatusResponse>({
    path: fleetSetupRouteService.getFleetSetupPath(),
    method: 'get',
  });
};

export const sendPostFleetSetup = ({ forceRecreate }: { forceRecreate: boolean }) => {
  return sendRequest({
    method: 'post',
    path: fleetSetupRouteService.postFleetSetupPath(),
    body: {
      forceRecreate,
    },
  });
};
