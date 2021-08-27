/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Outlet } from '@kbn/typed-react-router-config';
import React from 'react';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { ServiceInventoryTitle } from '../home';

export function ApmServiceWrapper() {
  const {
    path: { serviceName },
    query,
  } = useApmParams('/services/:serviceName');

  const router = useApmRouter();

  useBreadcrumb([
    {
      title: ServiceInventoryTitle,
      href: router.link('/services', { query }),
    },
    {
      title: serviceName,
      href: router.link('/services/:serviceName', {
        query,
        path: { serviceName },
      }),
    },
  ]);

  return <Outlet />;
}
