/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import type { Adapters } from '../../../common/adapters/types';
import type { InspectorViewDescription } from '../../types';

const RequestsViewComponent = lazy(() => import('./components/requests_view'));

export const getRequestsViewDescription = (): InspectorViewDescription => ({
  title: i18n.translate('inspector.requests.requestsTitle', {
    defaultMessage: 'Requests',
  }),
  order: 20,
  help: i18n.translate('inspector.requests.requestsDescriptionTooltip', {
    defaultMessage: 'View the requests that collected the data',
  }),
  shouldShow(adapters: Adapters) {
    return Boolean(adapters.requests);
  },
  component: RequestsViewComponent,
});
