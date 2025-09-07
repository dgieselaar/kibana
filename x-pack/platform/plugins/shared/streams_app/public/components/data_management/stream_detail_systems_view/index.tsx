/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Streams, System } from '@kbn/streams-schema';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SystemList } from './system_list';
import { useStreamDescription } from './use_stream_description';
import { useIdentifySystems } from './use_identify_systems';
import { SuggestedSystemsFlyout } from './suggested_systems_flyout';
import { useKibana } from '../../../hooks/use_kibana';
import { useSystemsApi } from './use_systems_api';
import { AddSignificantEventFlyout } from '../../stream_detail_significant_events_view/add_significant_event_flyout/add_significant_event_flyout';
import { useSignificantEventsApi } from '../../../hooks/use_significant_events_api';

interface Props {
  definition: Streams.all.GetResponse;
}

export function StreamDetailSystemsView({ definition }: Props) {
  const {
    core: { notifications },
  } = useKibana();

  const { description, setDescription, generateDescription } = useStreamDescription(
    definition.stream
  );

  const [systems, setSystems] = useState(definition.stream.systems ?? []);

  const [suggestedSystems, setSuggestedSystems] = useState<System[] | undefined>(undefined);

  const [isIdentifying, setIsIdentifying] = useState(false);

  const { identifySystems } = useIdentifySystems({ definition: definition.stream });

  const { addSystems, removeSystem, updateSystem } = useSystemsApi({
    name: definition.stream.name,
  });

  const [sigEventsSystem, setSigEventsSystem] = useState<System | undefined>(undefined);

  const sigEventsAPI = useSignificantEventsApi({ name: definition.stream.name });

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <SystemList
            systems={systems}
            isIdentifying={isIdentifying}
            onIdentifyClick={() => {
              setIsIdentifying(true);
              identifySystems()
                .then((response) => {
                  setSuggestedSystems(!!response?.systems.length ? response.systems : undefined);
                })
                .catch(() => {})
                .finally(() => {
                  setIsIdentifying(false);
                });
            }}
            onRemoveClick={(system) => {
              return removeSystem(system).then(() => {
                setSystems((prev) => prev.filter((item) => item.name !== system.name));
              });
            }}
            onUpdateClick={(system) => {
              return updateSystem(system).then(() => {
                setSystems((prev) =>
                  prev.map((item) => (item.name === system.name ? { ...item, ...system } : item))
                );
              });
            }}
            onGenerateSigEventsClick={(system) => {
              setSigEventsSystem(system);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {suggestedSystems !== undefined ? (
        <SuggestedSystemsFlyout
          name={definition.stream.name}
          onClose={() => {
            setSuggestedSystems(undefined);
          }}
          onSystemsAccept={(next) => {
            addSystems(next)
              .then(() => {
                setSystems(suggestedSystems);
                setSuggestedSystems(undefined);
              })
              .catch((error) => {
                notifications.showErrorDialog({
                  title: i18n.translate(
                    'xpack.streams.streamDetailSystemsView.updateSystemsErrorDialogTitle',
                    {
                      defaultMessage: `Failed to update systems`,
                    }
                  ),
                  error,
                });
              });
          }}
          systems={suggestedSystems}
        />
      ) : null}
      {sigEventsSystem ? (
        <AddSignificantEventFlyout
          definition={definition.stream}
          system={sigEventsSystem}
          onClose={() => {
            setSigEventsSystem(undefined);
          }}
          onSave={async (saveData) => {
            const queries = saveData.type === 'single' ? [saveData.query] : saveData.queries;

            await sigEventsAPI.bulk(queries.map((query) => ({ index: query }))).then(
              () => {
                notifications.toasts.addSuccess({
                  title: i18n.translate(
                    'xpack.streams.significantEvents.savedMultiple.successfullyToastTitle',
                    { defaultMessage: `Saved significant events queries successfully` }
                  ),
                });

                setSigEventsSystem(undefined);
              },
              (error) => {
                notifications.showErrorDialog({
                  title: i18n.translate(
                    'xpack.streams.significantEvents.savedMultiple.errorToastTitle',
                    { defaultMessage: 'Could not save significant events queries' }
                  ),
                  error,
                });
              }
            );
          }}
          initialFlow="ai"
        />
      ) : null}
    </>
  );
}
