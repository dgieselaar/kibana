/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useActiveRoutes } from '@kbn/ink/router';
import { useAppState } from '../state/use_app_state';
import type { StreamsAICLIRouteHandle } from '../types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface HeaderProps {}

export function Header({}: HeaderProps) {
  const { state } = useAppState();

  const active = useActiveRoutes<StreamsAICLIRouteHandle>();

  const breadcrumbParts = active.map((r) => r.handle?.label).filter(Boolean) as string[];
  const breadcrumbText = breadcrumbParts.length > 0 ? breadcrumbParts.join(' > ') : 'Home';

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">
          Streams AI CLI
        </Text>
      </Box>
      <Box>
        <Text dimColor>{breadcrumbText}</Text>
      </Box>
      <Box gap={2}>
        {state.connector && (
          <Box>
            <Text dimColor>Connector: </Text>
            <Text color="green">
              {state.connector.name} ({state.connector.connectorId})
            </Text>
          </Box>
        )}
        <Box>
          <Text dimColor>Time Range: </Text>
          <Text color="yellow">{state.timeRange.option.label}</Text>
        </Box>
      </Box>
      <Box>
        <Text dimColor>─────────────────────────────────────────────────────────────</Text>
      </Box>
    </Box>
  );
}
