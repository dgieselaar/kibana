/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ActionContext } from '../types';

interface AnalyzeStreamProps {
  context: ActionContext;
  onBack: () => void;
}

export function AnalyzeStream({ context, onBack }: AnalyzeStreamProps) {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    const analyze = async () => {
      try {
        setStatus('loading');
        // Placeholder - analyzeStream workflow is currently a no-op
        // This would call the analyze workflow when implemented
        setResult(`Stream analysis for ${context.stream.name} would appear here.
        
This is a placeholder for the analyzeStream workflow, which is currently not implemented.`);
        setStatus('ready');
      } catch (err) {
        setResult(`Error: ${(err as Error).message}`);
        setStatus('ready');
      }
    };

    analyze();
  }, [context]);

  useInput((input) => {
    if (input === 'q') {
      onBack();
    }
  });

  if (status === 'loading') {
    return (
      <Box>
        <Text color="yellow">Analyzing stream...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Stream Analysis: {context.stream.name}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>{result}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>q: Back</Text>
      </Box>
    </Box>
  );
}
