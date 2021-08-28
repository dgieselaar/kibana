/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { BehaviorSubject } from 'rxjs';
import type { LoadingCountSetup } from './loading_count_service';
import { LoadingCountService } from './loading_count_service';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<LoadingCountSetup> = {
    addLoadingCountSource: jest.fn(),
    getLoadingCount$: jest.fn(),
  };
  setupContract.getLoadingCount$.mockReturnValue(new BehaviorSubject(0));
  return setupContract;
};

type LoadingCountServiceContract = PublicMethodsOf<LoadingCountService>;
const createServiceMock = () => {
  const mocked: jest.Mocked<LoadingCountServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createSetupContractMock());
  mocked.start.mockReturnValue(createSetupContractMock());

  return mocked;
};

export const loadingCountServiceMock = {
  create: createServiceMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};
