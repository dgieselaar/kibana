/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Box, Text } from 'ink';
import React, { useMemo } from 'react';
import type { MenuItemProps } from '@kbn/ink/menu';
import { Menu } from '@kbn/ink/menu';
import { useAppState } from '../state/use_app_state';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SelectConnectorProps {}

export function SelectConnector({}: SelectConnectorProps) {
  const {
    state: { connectors },
    setConnector,
    back,
  } = useAppState();

  const items = useMemo(() => {
    if (connectors.state === 'resolved') {
      return connectors.data.connectors.map((connector): MenuItemProps => {
        return {
          label: connector.name,
        };
      });
    }
    return [];
  }, [connectors]);

  if (connectors.state === 'pending') {
    return (
      <Box>
        <Text color="yellow">Loading connectors...</Text>
      </Box>
    );
  }

  if (connectors.state === 'rejected') {
    return (
      <Box flexDirection="column">
        <Text color="red">Error loading connectors: {connectors.error.message}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press q to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Menu
      label="Select Connector"
      items={items}
      onSelect={(item) => {
        const connectorToSelect = connectors.data.connectors.find(
          (connector) => connector.name === item.label
        );

        if (connectorToSelect) {
          setConnector(connectorToSelect);
        }
      }}
      onBack={() => {
        back();
      }}
    />
  );
}
