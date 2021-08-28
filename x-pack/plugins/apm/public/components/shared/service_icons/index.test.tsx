/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// import { renderWithTheme } from '../../../../utils/testHelpers';
import { fireEvent, render } from '@testing-library/react';
import { merge } from 'lodash';
import type { ReactNode } from 'react';
import React from 'react';
import { ServiceIcons } from '.';
import type { CoreStart } from '../../../../../../../src/core/public/types';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public/context/context';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import * as fetcherHook from '../../../hooks/use_fetcher';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

const addWarning = jest.fn();
const httpGet = jest.fn();

function Wrapper({ children }: { children?: ReactNode }) {
  const mockPluginContext = (merge({}, mockApmPluginContextValue, {
    core: { http: { get: httpGet }, notifications: { toasts: { addWarning } } },
  }) as unknown) as ApmPluginContextValue;

  return (
    <KibanaReactContext.Provider>
      <MockApmPluginContextWrapper value={mockPluginContext}>
        <MockUrlParamsContextProvider
          params={{
            rangeFrom: 'now-15m',
            rangeTo: 'now',
            start: 'mystart',
            end: 'myend',
          }}
        >
          {children}
        </MockUrlParamsContextProvider>
      </MockApmPluginContextWrapper>
    </KibanaReactContext.Provider>
  );
}

describe('ServiceIcons', () => {
  describe('icons', () => {
    it('Shows loading spinner while fetching data', () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: undefined,
        status: fetcherHook.FETCH_STATUS.LOADING,
        refetch: jest.fn(),
      });
      const { getByTestId, queryAllByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons serviceName="foo" />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(getByTestId('loading')).toBeInTheDocument();
      expect(queryAllByTestId('service')).toHaveLength(0);
      expect(queryAllByTestId('container')).toHaveLength(0);
      expect(queryAllByTestId('cloud')).toHaveLength(0);
    });
    it("doesn't show any icons", () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: {},
        status: fetcherHook.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const { queryAllByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons serviceName="foo" />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(queryAllByTestId('service')).toHaveLength(0);
      expect(queryAllByTestId('container')).toHaveLength(0);
      expect(queryAllByTestId('cloud')).toHaveLength(0);
    });
    it('shows service icon', () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: {
          agentName: 'java',
        },
        status: fetcherHook.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const { queryAllByTestId, getByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons serviceName="foo" />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(queryAllByTestId('container')).toHaveLength(0);
      expect(queryAllByTestId('cloud')).toHaveLength(0);
    });
    it('shows service and container icons', () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: {
          agentName: 'java',
          containerType: 'Kubernetes',
        },
        status: fetcherHook.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const { queryAllByTestId, getByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons serviceName="foo" />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(queryAllByTestId('cloud')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
    });
    it('shows service, container and cloud icons', () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: {
          agentName: 'java',
          containerType: 'Kubernetes',
          cloudProvider: 'gcp',
        },
        status: fetcherHook.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const { queryAllByTestId, getByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons serviceName="foo" />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();
    });
  });

  describe('details', () => {
    const callApmApi = (apisMockData: Record<string, object>) => ({
      endpoint,
    }: {
      endpoint: string;
    }) => {
      return apisMockData[endpoint];
    };
    it('Shows loading spinner while fetching data', () => {
      const apisMockData = {
        'GET /api/apm/services/{serviceName}/metadata/icons': {
          data: {
            agentName: 'java',
            containerType: 'Kubernetes',
            cloudProvider: 'gcp',
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
        'GET /api/apm/services/{serviceName}/metadata/details': {
          data: undefined,
          status: fetcherHook.FETCH_STATUS.LOADING,
          refetch: jest.fn(),
        },
      };
      jest
        .spyOn(fetcherHook, 'useFetcher')
        .mockImplementation((func: Function, deps: string[]) => {
          return func(callApmApi(apisMockData)) || {};
        });

      const { queryAllByTestId, getByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons serviceName="foo" />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();
      fireEvent.click(getByTestId('popover_Service'));
      expect(getByTestId('loading-content')).toBeInTheDocument();
    });

    it('shows service content', () => {
      const apisMockData = {
        'GET /api/apm/services/{serviceName}/metadata/icons': {
          data: {
            agentName: 'java',
            containerType: 'Kubernetes',
            cloudProvider: 'gcp',
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
        'GET /api/apm/services/{serviceName}/metadata/details': {
          data: { service: { versions: ['v1.0.0'] } },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
      };
      jest
        .spyOn(fetcherHook, 'useFetcher')
        .mockImplementation((func: Function, deps: string[]) => {
          return func(callApmApi(apisMockData)) || {};
        });

      const { queryAllByTestId, getByTestId, getByText } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons serviceName="foo" />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();

      fireEvent.click(getByTestId('popover_Service'));
      expect(queryAllByTestId('loading-content')).toHaveLength(0);
      expect(getByText('Service')).toBeInTheDocument();
      expect(getByText('v1.0.0')).toBeInTheDocument();
    });
  });
});
