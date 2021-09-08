/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { I18LABELS } from '../translations';
import { EmbeddedMap } from './EmbeddedMap';

export function VisitorBreakdownMap() {
  return (
    <>
      <EuiTitle size="xs">
        <h3>{I18LABELS.pageLoadDurationByRegion}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div style={{ height: 400 }}>
        <EmbeddedMap />
      </div>
    </>
  );
}
