/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { LogEntry } from '../types';

interface LogsDisplayProps {
  logs: LogEntry[];
  onBack: () => void;
}

export function LogsDisplay({ logs, onBack }: LogsDisplayProps) {
  useInput((input, key) => {
    if (input === 'q' || key.return) {
      onBack();
    }
  });

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'red';
      case 'warn':
        return 'yellow';
      case 'info':
        return 'blue';
      case 'debug':
        return 'gray';
      default:
        return undefined;
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Logs ({logs.length} entries)</Text>
      </Box>
      <Box flexDirection="column" height={20} overflow="hidden">
        {logs.slice(-20).map((log, index) => (
          <Box key={index}>
            <Text color={getLevelColor(log.level)}>
              [{new Date(log.timestamp).toLocaleTimeString()}] [{log.level.toUpperCase()}]{' '}
              {log.message}
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>q/Enter: Back</Text>
      </Box>
    </Box>
  );
}
