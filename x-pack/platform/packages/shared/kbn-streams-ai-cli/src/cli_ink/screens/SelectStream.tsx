/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Menu, type MenuItem } from '../components/Menu';
import type { Streams } from '@kbn/streams-schema';
import type { KibanaClient } from '@kbn/kibana-api-cli';

interface SelectStreamProps {
  streams: Streams.ingest.all.Definition[];
  currentStream?: Streams.ingest.all.Definition;
  kibanaClient: KibanaClient;
  onSelect: (stream: Streams.ingest.all.Definition) => void;
  onRefresh: () => Promise<void>;
  onBack: () => void;
}

export function SelectStream({
  streams,
  currentStream,
  onSelect,
  onRefresh,
  onBack,
}: SelectStreamProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const items: MenuItem[] = [
    ...streams.map((stream) => ({
      label: stream.name,
      value: stream.name,
      description: currentStream?.name === stream.name ? '(current)' : undefined,
    })),
    { label: 'Refresh list of streams', value: '_refresh' },
  ];

  const handleSelect = async (value: string) => {
    if (value === '_refresh') {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    } else {
      const stream = streams.find((s) => s.name === value);
      if (stream) {
        onSelect(stream);
      }
    }
  };

  if (isRefreshing) {
    return (
      <Box>
        <Text color="yellow">Refreshing streams...</Text>
      </Box>
    );
  }

  return <Menu items={items} onSelect={handleSelect} onBack={onBack} title="Select Stream" />;
}
