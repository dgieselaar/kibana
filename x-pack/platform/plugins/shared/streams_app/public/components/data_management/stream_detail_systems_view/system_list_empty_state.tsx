/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { IdentifySystemButton } from './identify_system_button';

const PANEL_EMPTY_TEXT = i18n.translate(
  'xpack.streams.streamDetailSystemsView.systemList.identifySystemsEmptyText',
  {
    defaultMessage: `No systems have been identified yet. To fully leverage Elastic's AI capabilities, start the system identification process.`,
  }
);

export function SystemListEmptyState({
  isIdentifying,
  onIdentifyClick,
}: {
  isIdentifying: boolean;
  onIdentifyClick: () => void;
}) {
  return (
    <EuiPanel color="primary" hasShadow={false} hasBorder={true}>
      <EuiFlexGroup direction="column">
        <EuiText>{PANEL_EMPTY_TEXT}</EuiText>
        <EuiFlexItem
          grow={false}
          className={css`
            align-items: flex-end;
          `}
        >
          <IdentifySystemButton isLoading={isIdentifying} onClick={onIdentifyClick} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
