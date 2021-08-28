/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FunctionComponent } from 'react';
import React from 'react';

export const DefaultPageTitle: FunctionComponent = () => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage id="xpack.fleet.overviewPageTitle" defaultMessage="Fleet" />
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.fleet.overviewPageSubtitle"
              defaultMessage="Centralized management for Elastic Agents"
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
