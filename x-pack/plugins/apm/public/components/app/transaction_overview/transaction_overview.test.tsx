/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { queryByLabelText } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { TransactionOverview } from '.';
import type { CoreStart } from '../../../../../../../src/core/public/types';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public/context/context';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../context/apm_service/apm_service_context';
import * as useServiceAgentNameHook from '../../../context/apm_service/use_service_agent_fetcher';
import * as useServiceTransactionTypesHook from '../../../context/apm_service/use_service_transaction_types_fetcher';
import type { IUrlParams } from '../../../context/url_params_context/types';
import { UrlParamsProvider } from '../../../context/url_params_context/url_params_context';
import * as useFetcherHook from '../../../hooks/use_fetcher';
import {
  disableConsoleWarning,
  renderWithTheme,
} from '../../../utils/testHelpers';
import { fromQuery } from '../../shared/Links/url_helpers';

const KibanaReactContext = createKibanaReactContext(({
  uiSettings: { get: () => true },
  usageCollection: { reportUiCounter: () => {} },
} as unknown) as Partial<CoreStart>);

const history = createMemoryHistory();
jest.spyOn(history, 'push');
jest.spyOn(history, 'replace');

function setup({
  urlParams,
  serviceTransactionTypes,
}: {
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}) {
  history.replace({
    pathname: '/services/foo/transactions',
    search: fromQuery(urlParams),
  });

  // mock transaction types
  jest
    .spyOn(useServiceTransactionTypesHook, 'useServiceTransactionTypesFetcher')
    .mockReturnValue(serviceTransactionTypes);

  // mock agent
  jest
    .spyOn(useServiceAgentNameHook, 'useServiceAgentFetcher')
    .mockReturnValue({
      agentName: 'nodejs',
      runtimeName: 'node',
      error: undefined,
      status: useFetcherHook.FETCH_STATUS.SUCCESS,
    });

  jest.spyOn(useFetcherHook, 'useFetcher').mockReturnValue({} as any);

  return renderWithTheme(
    <KibanaReactContext.Provider>
      <MockApmPluginContextWrapper history={history}>
        <UrlParamsProvider>
          <ApmServiceContextProvider>
            <TransactionOverview />
          </ApmServiceContextProvider>
        </UrlParamsProvider>
      </MockApmPluginContextWrapper>
    </KibanaReactContext.Provider>
  );
}

describe('TransactionOverview', () => {
  let consoleMock: jest.SpyInstance;

  beforeAll(() => {
    consoleMock = disableConsoleWarning('Warning: componentWillReceiveProps');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no transaction type is given in urlParams', () => {
    it('should redirect to first type', () => {
      setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {},
      });
      expect(history.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'transactionType=firstType',
        })
      );
    });
  });

  const FILTER_BY_TYPE_LABEL = 'Transaction type';

  describe('when a transaction type is selected, and there are no other transaction types', () => {
    it('does not render a radio group with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType'],
        urlParams: {
          transactionType: 'firstType',
        },
      });

      expect(queryByLabelText(container, FILTER_BY_TYPE_LABEL)).toBeNull();
    });
  });
});
