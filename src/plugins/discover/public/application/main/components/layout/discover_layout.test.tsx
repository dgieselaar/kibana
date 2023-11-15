/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { EuiPageSidebar } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
import { DiscoverLayout } from './discover_layout';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import {
  createSearchSourceMock,
  searchSourceInstanceMock,
} from '@kbn/data-plugin/common/search/search_source/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import {
  AvailableFields$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../services/discover_data_state_container';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { createSearchSessionMock } from '../../../../__mocks__/search_session';
import { getSessionServiceMock } from '@kbn/data-plugin/public/search/session/mocks';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import { act } from 'react-dom/test-utils';
import { ErrorCallout } from '../../../../components/common/error_callout';
import * as localStorageModule from 'react-use/lib/useLocalStorage';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useResizeObserver: jest.fn(() => ({ width: 1000, height: 1000 })),
}));

jest.spyOn(localStorageModule, 'default');

setHeaderActionMenuMounter(jest.fn());

async function mountComponent(
  dataView: DataView,
  prevSidebarClosed?: boolean,
  mountOptions: { attachTo?: HTMLElement } = {},
  query?: Query | AggregateQuery,
  isPlainRecord?: boolean,
  main$: DataMain$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    recordRawType: isPlainRecord ? RecordRawType.PLAIN : RecordRawType.DOCUMENT,
    foundDocuments: true,
  }) as DataMain$
) {
  const searchSourceMock = createSearchSourceMock({});
  const services = createDiscoverServicesMock();
  const time = { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  services.data.query.timefilter.timefilter.getTime = () => time;
  (services.data.query.queryString.getDefaultQuery as jest.Mock).mockReturnValue({
    language: 'kuery',
    query: '',
  });
  (services.data.query.getState as jest.Mock).mockReturnValue({
    filters: [],
    query,
    time,
  });
  (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
    jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 2 } } }))
  );
  (localStorageModule.default as jest.Mock).mockImplementation(
    jest.fn(() => [prevSidebarClosed, jest.fn()])
  );

  const stateContainer = getDiscoverStateMock({ isTimeBased: true });

  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: esHitsMock.map((esHit) => buildDataTableRecord(esHit, dataView)),
  }) as DataDocuments$;

  const availableFields$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    fields: [] as string[],
  }) as AvailableFields$;

  const totalHits$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: Number(esHitsMock.length),
  }) as DataTotalHits$;

  stateContainer.dataState.data$ = {
    main$,
    documents$,
    totalHits$,
    availableFields$,
  };

  const session = getSessionServiceMock();

  session.getSession$.mockReturnValue(new BehaviorSubject('123'));

  stateContainer.appState.update({ interval: 'auto', query });
  stateContainer.internalState.transitions.setDataView(dataView);

  const props = {
    dataView,
    inspectorAdapters: { requests: new RequestAdapter() },
    navigateTo: jest.fn(),
    onChangeDataView: jest.fn(),
    onUpdateQuery: jest.fn(),
    savedSearch: savedSearchMock,
    searchSource: searchSourceMock,
    state: { columns: [], query, hideChart: false, interval: 'auto' },
    stateContainer,
    setExpandedDoc: jest.fn(),
    updateDataViewList: jest.fn(),
  };
  stateContainer.searchSessionManager = createSearchSessionMock(session).searchSessionManager;

  const component = mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverMainProvider value={stateContainer}>
        <DiscoverLayout {...props} />
      </DiscoverMainProvider>
    </KibanaContextProvider>,
    mountOptions
  );

  // wait for lazy modules
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  component.update();

  return component;
}

describe('Discover component', () => {
  test('selected data view without time field displays no chart toggle', async () => {
    const container = document.createElement('div');
    await mountComponent(dataViewMock, undefined, { attachTo: container });
    expect(
      container.querySelector('[data-test-subj="unifiedHistogramChartOptionsToggle"]')
    ).toBeNull();
  }, 10000);

  test('selected data view with time field displays chart toggle', async () => {
    const container = document.createElement('div');
    await mountComponent(dataViewWithTimefieldMock, undefined, { attachTo: container });
    expect(
      container.querySelector('[data-test-subj="unifiedHistogramChartOptionsToggle"]')
    ).not.toBeNull();
  }, 10000);

  describe('sidebar', () => {
    test('should be opened if discover:sidebarClosed was not set', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, undefined);
      expect(component.find(EuiPageSidebar).length).toBe(1);
    }, 10000);

    test('should be opened if discover:sidebarClosed is false', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, false);
      expect(component.find(EuiPageSidebar).length).toBe(1);
    }, 10000);

    test('should be closed if discover:sidebarClosed is true', async () => {
      const component = await mountComponent(dataViewWithTimefieldMock, true);
      expect(component.find(EuiPageSidebar).length).toBe(0);
    }, 10000);
  });

  it('shows the no results error display', async () => {
    const component = await mountComponent(
      dataViewWithTimefieldMock,
      undefined,
      undefined,
      undefined,
      undefined,
      new BehaviorSubject({
        fetchStatus: FetchStatus.ERROR,
        recordRawType: RecordRawType.DOCUMENT,
        foundDocuments: false,
        error: new Error('No results'),
      }) as DataMain$
    );
    expect(component.find(ErrorCallout)).toHaveLength(1);
  }, 10000);
});
