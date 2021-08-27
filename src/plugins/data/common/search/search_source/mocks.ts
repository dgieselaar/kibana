/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { MockedKeys } from '@kbn/utility-types/jest';
import { of } from 'rxjs';
import { uiSettingsServiceMock } from '../../../../../core/public/ui_settings/ui_settings_service.mock';
import { SearchSource } from './search_source';
import type { ISearchSource, ISearchStartSearchSource, SearchSourceFields } from './types';

export const searchSourceInstanceMock: MockedKeys<ISearchSource> = {
  setPreferredSearchStrategyId: jest.fn(),
  setFields: jest.fn().mockReturnThis(),
  setField: jest.fn().mockReturnThis(),
  removeField: jest.fn().mockReturnThis(),
  getId: jest.fn(),
  getFields: jest.fn(),
  getField: jest.fn(),
  getOwnField: jest.fn(),
  create: jest.fn().mockReturnThis(),
  createCopy: jest.fn().mockReturnThis(),
  createChild: jest.fn().mockReturnThis(),
  setParent: jest.fn(),
  getParent: jest.fn().mockReturnThis(),
  fetch$: jest.fn().mockReturnValue(of({})),
  fetch: jest.fn().mockResolvedValue({}),
  onRequestStart: jest.fn(),
  getSearchRequestBody: jest.fn(),
  destroy: jest.fn(),
  history: [],
  getSerializedFields: jest.fn(),
  serialize: jest.fn(),
};

export const searchSourceCommonMock: jest.Mocked<ISearchStartSearchSource> = {
  create: jest.fn().mockReturnValue(searchSourceInstanceMock),
  createEmpty: jest.fn().mockReturnValue(searchSourceInstanceMock),
};

export const createSearchSourceMock = (fields?: SearchSourceFields, response?: any) =>
  new SearchSource(fields, {
    getConfig: uiSettingsServiceMock.createStartContract().get,
    search: jest.fn().mockReturnValue(
      of(
        response ?? {
          rawResponse: { hits: { hits: [], total: 0 } },
          isPartial: false,
          isRunning: false,
        }
      )
    ),
    onResponse: jest.fn().mockImplementation((req, res) => res),
  });
