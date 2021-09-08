/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useBreakPoints } from '../../../hooks/use_break_points';
import { ClientMetrics } from './ClientMetrics';
import { ImpactfulMetrics } from './ImpactfulMetrics';
import { PageLoadAndViews } from './Panels/PageLoadAndViews';
import { VisitorBreakdownsPanel } from './Panels/VisitorBreakdowns';
import { UXMetrics } from './UXMetrics';

export function RumDashboard() {
  const { isSmall } = useBreakPoints();

  return (
    <EuiFlexGroup direction={isSmall ? 'row' : 'column'} gutterSize="s">
      <EuiFlexItem>
        <ClientMetrics />
      </EuiFlexItem>
      <EuiFlexItem>
        <UXMetrics />
      </EuiFlexItem>
      <EuiFlexItem>
        <PageLoadAndViews />
      </EuiFlexItem>
      <EuiFlexItem>
        <VisitorBreakdownsPanel />
      </EuiFlexItem>
      <EuiFlexItem>
        <ImpactfulMetrics />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
