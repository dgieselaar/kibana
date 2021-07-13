/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock } from '@elastic/eui';
import React from 'react';
import { Adapters, InspectorViewProps } from '../../../../../../src/plugins/inspector/public';

export interface AlertsAsCodeInspectorAdapters extends Adapters {
  json: any;
}

type AlertsAsCodeInspectorViewProps = InspectorViewProps<AlertsAsCodeInspectorAdapters>;

export function AlertsAsCodeInspectorView({ adapters }: AlertsAsCodeInspectorViewProps) {
  return (
    <EuiCodeBlock isCopyable={true} language="json">
      {JSON.stringify(adapters.json, null, 2)}
    </EuiCodeBlock>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertsAsCodeInspectorView;
