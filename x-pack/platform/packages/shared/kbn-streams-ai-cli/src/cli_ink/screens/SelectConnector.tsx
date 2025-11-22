/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Menu, type MenuItem } from '../components/Menu';
import type { InferenceConnector } from '@kbn/inference-common';
import type { KibanaClient } from '@kbn/kibana-api-cli';

interface SelectConnectorProps {
  kibanaClient: KibanaClient;
  currentConnector?: InferenceConnector;
  onSelect: (connector: InferenceConnector) => void;
  onBack: () => void;
}

export function SelectConnector({
  kibanaClient,
  currentConnector,
  onSelect,
  onBack,
}: SelectConnectorProps) {
  const [connectors, setConnectors] = useState<InferenceConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConnectors = async () => {
      try {
        setLoading(true);
        const response = await kibanaClient.fetch<{ connectors: InferenceConnector[] }>(
          '/api/actions/connectors',
          {
            method: 'GET',
          }
        );
        setConnectors(response.connectors || []);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadConnectors();
  }, [kibanaClient]);

  if (loading) {
    return (
      <Box>
        <Text color="yellow">Loading connectors...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error loading connectors: {error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press q to go back</Text>
        </Box>
      </Box>
    );
  }

  const items: MenuItem[] = connectors.map((connector) => ({
    label: `${connector.name} (${connector.connectorId})`,
    value: connector.connectorId,
    description: currentConnector?.connectorId === connector.connectorId ? '(current)' : undefined,
  }));

  const handleSelect = (value: string) => {
    const connector = connectors.find((c) => c.connectorId === value);
    if (connector) {
      onSelect(connector);
    }
  };

  return <Menu items={items} onSelect={handleSelect} onBack={onBack} title="Select Connector" />;
}
