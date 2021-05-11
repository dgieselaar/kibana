/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';

export function AlertsAsCodeDemoPage() {
  return (
    <EuiPageTemplate
      template="default"
      pageHeader={{
        pageTitle: (
          <>
            Alerts as code demo <ExperimentalBadge />
          </>
        ),
      }}
    >
      Hello world
    </EuiPageTemplate>
  );
}
