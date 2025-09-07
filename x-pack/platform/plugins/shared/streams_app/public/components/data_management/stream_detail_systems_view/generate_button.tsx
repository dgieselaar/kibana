/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function GenerateButton({
  onClick,
  isLoading,
  isDisabled,
}: {
  onClick: () => void;
  isLoading: boolean;
  isDisabled?: boolean;
}) {
  return (
    <EuiButton
      iconType="sparkles"
      onClick={() => {
        onClick();
      }}
      isLoading={isLoading}
      fill
      size="s"
      isDisabled={isDisabled}
    >
      {i18n.translate('xpack.streams.streamDetailSystemsView.generateButtonLabel', {
        defaultMessage: 'Generate',
      })}
    </EuiButton>
  );
}
