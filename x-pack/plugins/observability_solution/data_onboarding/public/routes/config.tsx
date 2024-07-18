/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import React from 'react';
import { DataOnboardingPageTemplate } from '../components/data_onboarding_page_template';
import { DataOnboardingListView } from '../components/data_onboarding_list_view';
import { DataOnboardingServicesView } from '../components/data_onboarding_services_view';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
const dataOnboardingRoutes = {
  '/': {
    element: (
      <DataOnboardingPageTemplate>
        <Outlet />
      </DataOnboardingPageTemplate>
    ),
    children: {
      '/': {
        element: <DataOnboardingListView />,
        params: t.partial({}),
      },
      '/services': {
        element: <DataOnboardingServicesView />,
        params: t.partial({}),
      },
    },
  },
};

export type DataOnboardingRoutes = typeof dataOnboardingRoutes;

export const dataOnboardingRouter = createRouter(dataOnboardingRoutes);

export type DataOnboardingRouter = typeof dataOnboardingRouter;
