/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { AppState } from '../types';
import { getTimeRangeById } from '../utils/time_ranges';

interface HeaderProps {
  state: AppState;
}

export function Header({ state }: HeaderProps) {
  const breadcrumbText = state.breadcrumbs.length > 0 ? state.breadcrumbs.join(' > ') : 'Home';
  const timeRange = getTimeRangeById(state.timeRangeId, state.customTimeRange);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="cyan">
          Streams AI CLI
        </Text>
      </Box>
      <Box>
        <Text dimColor>{breadcrumbText}</Text>
      </Box>
      <Box marginTop={1} gap={2}>
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
          <Text color="yellow">{timeRange.label}</Text>
        </Box>
        {state.stream && (
          <Box>
            <Text dimColor>Stream: </Text>
            <Text color="magenta">{state.stream.name}</Text>
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>─────────────────────────────────────────────────────────────</Text>
      </Box>
    </Box>
  );
}
