/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import type { AppMountParameters } from '../../../../../../src/core/public/application/types';
import type { UXMetrics } from './core_web_vitals';

export interface HeaderMenuPortalProps {
  children: ReactNode;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

export interface CoreVitalProps {
  loading: boolean;
  data?: UXMetrics | null;
  displayServiceName?: boolean;
  serviceName?: string;
  totalPageViews?: number;
  displayTrafficMetric?: boolean;
}
