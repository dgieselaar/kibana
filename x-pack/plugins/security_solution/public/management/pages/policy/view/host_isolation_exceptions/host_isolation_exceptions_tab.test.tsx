/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { EndpointDocGenerator } from '../../../../../../common/endpoint/generate_data';
import { PolicyData } from '../../../../../../common/endpoint/types';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { getPolicyHostIsolationExceptionsPath } from '../../../../common/routing';
import { getHostIsolationExceptionItems } from '../../../host_isolation_exceptions/service';
import { PolicyHostIsolationExceptionsTab } from './host_isolation_exceptions_tab';

jest.mock('../../../host_isolation_exceptions/service');

const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;

const endpointGenerator = new EndpointDocGenerator('seed');

const emptyList = {
  data: [],
  page: 1,
  per_page: 10,
  total: 0,
};

describe('Policy details host isolation exceptions tab', () => {
  let policyId: string;
  let policy: PolicyData;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    getHostIsolationExceptionItemsMock.mockClear();
    policy = endpointGenerator.generatePolicyPackagePolicy();
    policyId = policy.id;
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = () =>
      (renderResult = mockedContext.render(<PolicyHostIsolationExceptionsTab policy={policy} />));

    history.push(getPolicyHostIsolationExceptionsPath(policyId));
  });

  it('should display display a "loading" state while requests happen', async () => {
    const promises: Array<() => void> = [];
    getHostIsolationExceptionItemsMock.mockImplementation(() => {
      return new Promise<void>((resolve) => promises.push(resolve));
    });
    render();
    expect(await renderResult.findByTestId('policyHostIsolationExceptionsTabLoading')).toBeTruthy();
    // prevent memory leaks
    promises.forEach((resolve) => resolve());
  });

  it("should display an 'unexistent' empty state if there are no host isolation exceptions at all", async () => {
    // mock no data for all requests
    getHostIsolationExceptionItemsMock.mockResolvedValue({
      ...emptyList,
    });
    render();
    expect(
      await renderResult.findByTestId('policy-host-isolation-exceptions-empty-unexisting')
    ).toBeTruthy();
  });

  it("should display an 'unassigned' empty state if there are no host isolation exceptions assigned", async () => {
    // mock no data for all requests
    getHostIsolationExceptionItemsMock.mockImplementation((params) => {
      // no filter = fetch all exceptions
      if (!params.filter) {
        return {
          ...emptyList,
          total: 1,
        };
      }
      return {
        ...emptyList,
      };
    });
    render();
    expect(
      await renderResult.findByTestId('policy-host-isolation-exceptions-empty-unassigned')
    ).toBeTruthy();
  });

  it('Should display the count of total assigned policies', async () => {
    getHostIsolationExceptionItemsMock.mockImplementation(() => {
      return getFoundExceptionListItemSchemaMock(4);
    });
    render();
    expect(
      await renderResult.findByTestId('policyHostIsolationExceptionsTabSubtitle')
    ).toHaveTextContent('There are 4 exceptions associated with this policy');
  });

  it('should apply a filter when requested from location search params', async () => {
    history.push(getPolicyHostIsolationExceptionsPath(policyId, { filter: 'my filter' }));
    getHostIsolationExceptionItemsMock.mockImplementation(() => {
      return getFoundExceptionListItemSchemaMock(4);
    });
    render();
    expect(getHostIsolationExceptionItemsMock).toHaveBeenLastCalledWith({
      filter: `((exception-list-agnostic.attributes.tags:"policy:${policyId}" OR exception-list-agnostic.attributes.tags:"policy:all")) AND ((exception-list-agnostic.attributes.name:(*my*filter*) OR exception-list-agnostic.attributes.description:(*my*filter*) OR exception-list-agnostic.attributes.entries.value:(*my*filter*)))`,
      http: mockedContext.coreStart.http,
      page: 1,
      perPage: 10,
    });
  });
});
