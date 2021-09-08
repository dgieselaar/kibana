/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import type { CoreStart } from 'kibana/public';
import type { ReactNode } from 'react';
import React from 'react';
import { Router } from 'react-router-dom';
import { ServiceMap } from '.';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import { License } from '../../../../../licensing/common/license';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { LicenseContext } from '../../../context/license/license_context';
import { UrlParamsProvider } from '../../../context/url_params_context/url_params_context';
import * as useFetcherModule from '../../../hooks/use_fetcher';

const history = createMemoryHistory();

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

const activeLicense = new License({
  signature: 'active test signature',
  license: {
    expiryDateInMillis: 0,
    mode: 'platinum',
    status: 'active',
    type: 'platinum',
    uid: '1',
  },
});

const expiredLicense = new License({
  signature: 'expired test signature',
  license: {
    expiryDateInMillis: 0,
    mode: 'platinum',
    status: 'expired',
    type: 'platinum',
    uid: '1',
  },
});

function createWrapper(license: License | null) {
  return ({ children }: { children?: ReactNode }) => {
    return (
      <EuiThemeProvider>
        <KibanaReactContext.Provider>
          <LicenseContext.Provider value={license || undefined}>
            <MockApmPluginContextWrapper>
              <Router history={history}>
                <UrlParamsProvider>{children}</UrlParamsProvider>
              </Router>
            </MockApmPluginContextWrapper>
          </LicenseContext.Provider>
        </KibanaReactContext.Provider>
      </EuiThemeProvider>
    );
  };
}

describe('ServiceMap', () => {
  describe('with no license', () => {
    it('renders null', async () => {
      expect(
        await render(
          <ServiceMap
            environment={ENVIRONMENT_ALL.value}
            kuery=""
            start="2021-08-20T10:00:00.000Z"
            end="2021-08-20T10:15:00.000Z"
          />,
          {
            wrapper: createWrapper(null),
          }
        ).queryByTestId('ServiceMap')
      ).not.toBeInTheDocument();
    });
  });

  describe('with an expired license', () => {
    it('renders the license banner', async () => {
      expect(
        await render(
          <ServiceMap
            environment={ENVIRONMENT_ALL.value}
            kuery=""
            start="2021-08-20T10:00:00.000Z"
            end="2021-08-20T10:15:00.000Z"
          />,
          {
            wrapper: createWrapper(expiredLicense),
          }
        ).findAllByText(/Platinum/)
      ).toHaveLength(1);
    });
  });

  describe('with an active license', () => {
    describe('with an empty response', () => {
      it('renders the empty banner', async () => {
        jest.spyOn(useFetcherModule, 'useFetcher').mockReturnValueOnce({
          data: { elements: [] },
          refetch: () => {},
          status: useFetcherModule.FETCH_STATUS.SUCCESS,
        });

        expect(
          await render(
            <ServiceMap
              environment={ENVIRONMENT_ALL.value}
              kuery=""
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />,
            {
              wrapper: createWrapper(activeLicense),
            }
          ).findAllByText(/No services available/)
        ).toHaveLength(1);
      });
    });
  });
});
