/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

const BUTTON_TEXT = i18n.translate(
  'xpack.streams.streamDetailSystemsView.systemList.identifySystemsButtonLabel',
  {
    defaultMessage: 'Identify systems',
  }
);

const BUTTON_IS_LOADING_TEXT = i18n.translate(
  'xpack.streams.streamDetailSystemsView.systemList.identifySystemsButtonLoadingLabel',
  {
    defaultMessage: 'Identifying systems',
  }
);

export function IdentifySystemButton({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <EuiButton
      iconType="sparkles"
      fill
      isLoading={isLoading}
      onClick={() => {
        onClick();
      }}
    >
      {isLoading ? BUTTON_IS_LOADING_TEXT : BUTTON_TEXT}
    </EuiButton>
  );
}
