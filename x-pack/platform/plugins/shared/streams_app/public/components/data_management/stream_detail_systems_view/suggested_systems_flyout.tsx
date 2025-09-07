/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { System } from '@kbn/streams-schema';
import React, { useState } from 'react';
import { SuggestedSystemsTable } from './suggested_systems_table';

export function SuggestedSystemsFlyout({
  name,
  systems,
  onClose,
  onSystemsAccept,
}: {
  name: string;
  systems: System[];
  onClose: () => void;
  onSystemsAccept: (systems: System[]) => void;
}) {
  const [selectedSystems, setSelectedSystems] = useState<System[]>(systems);
  const [isLoading, setIsLoading] = useState(false);

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'suggestedSystemsFlyoutTitle',
  });

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id={flyoutTitleId}>
            {i18n.translate('xpack.streams.suggestedSystemsFlyout.flyoutHeaderLabel', {
              defaultMessage: 'Add systems',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiText size="s">
            {i18n.translate('xpack.streams.suggestedSystemsFlyout.helpLabel', {
              defaultMessage: 'Select the systems which you want to attach to the {stream} stream',
              values: {
                stream: name,
              },
            })}
          </EuiText>
          <SuggestedSystemsTable
            systems={systems}
            selectedSystems={selectedSystems}
            setSelectedSystems={setSelectedSystems}
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton
          isLoading={isLoading}
          disabled={selectedSystems.length === 0}
          data-test-subj="streamsAppSuggestedSystemsFlyoutAddSystemsButton"
          onClick={async () => {
            setIsLoading(true);
            try {
              await onSystemsAccept(selectedSystems);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          {i18n.translate('xpack.streams.suggestedSystemsFlyout.addSystemsButtonLabel', {
            defaultMessage: 'Add systems',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
