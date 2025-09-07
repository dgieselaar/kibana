/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import type { System } from '@kbn/streams-schema';
import { SystemListEmptyState } from './system_list_empty_state';
import { SystemItem } from './system_item';
import { useGenerateDescription } from './use_generate_description';

function ManagedSystemItem({
  system,
  onRemoveClick,
  onUpdateClick,
  onGenerateSigEventsClick,
}: {
  system: System;
  onRemoveClick: () => Promise<void>;
  onUpdateClick: (next: System) => Promise<void>;
  onGenerateSigEventsClick: () => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);

  const { generateDescription } = useGenerateDescription();

  return (
    <SystemItem
      isGenerating={isGenerating}
      isUpdating={isUpdating}
      system={system}
      onGenerateClick={() => {
        setIsGenerating(true);
        return generateDescription(system).finally(() => {
          setIsGenerating(false);
        });
      }}
      onRemoveClick={() => {
        setIsUpdating(true);
        onRemoveClick().catch(() => {
          setIsUpdating(false);
        });
      }}
      onUpdateClick={(next) => {
        setIsUpdating(true);
        onUpdateClick(next).finally(() => {
          setIsUpdating(false);
        });
      }}
      onGenerateSigEventsClick={onGenerateSigEventsClick}
    />
  );
}

export function SystemList({
  systems,
  isIdentifying,
  onIdentifyClick,
  onRemoveClick,
  onUpdateClick,
  onGenerateSigEventsClick,
}: {
  systems: System[];
  isIdentifying: boolean;
  onIdentifyClick: () => void;
  onRemoveClick: (system: System) => void;
  onUpdateClick: (system: System) => void;
  onGenerateSigEventsClick: (system: System) => void;
}) {
  if (!systems.length) {
    return <SystemListEmptyState isIdentifying={isIdentifying} onIdentifyClick={onIdentifyClick} />;
  }

  return (
    <EuiFlexGroup direction="column">
      {systems.map((system) => (
        <ManagedSystemItem
          key={system.name}
          system={system}
          onRemoveClick={async () => {
            return onRemoveClick(system);
          }}
          onUpdateClick={async (next) => {
            return onUpdateClick(next);
          }}
          onGenerateSigEventsClick={() => {
            onGenerateSigEventsClick(system);
          }}
        />
      ))}
    </EuiFlexGroup>
  );
}
