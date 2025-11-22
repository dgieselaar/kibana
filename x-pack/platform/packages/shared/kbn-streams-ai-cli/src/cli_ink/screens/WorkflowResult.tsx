/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import copy from 'copy-to-clipboard';

interface WorkflowResultProps {
  workflowName: string;
  change: unknown;
  onApply: () => Promise<void>;
  onBack: () => void;
}

export function WorkflowResult({ workflowName, change, onApply, onBack }: WorkflowResultProps) {
  const [status, setStatus] = useState<'viewing' | 'applying' | 'applied' | 'copied'>('viewing');
  const [error, setError] = useState<string | null>(null);

  useInput(async (input) => {
    if (status === 'viewing') {
      if (input === 'a') {
        setStatus('applying');
        try {
          await onApply();
          setStatus('applied');
        } catch (err) {
          setError((err as Error).message);
          setStatus('viewing');
        }
      } else if (input === 'c') {
        const changeStr = JSON.stringify(change, null, 2);
        copy(changeStr);
        setStatus('copied');
        setTimeout(() => setStatus('viewing'), 2000);
      } else if (input === 'q') {
        onBack();
      }
    } else if (status === 'applied' && input === 'q') {
      onBack();
    }
  });

  const changeStr = JSON.stringify(change, null, 2);
  const lines = changeStr.split('\n');
  const displayLines = lines.slice(0, 20);
  const hasMore = lines.length > 20;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {workflowName} - Generated Change
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {displayLines.map((line, index) => (
          <Text key={index}>{line}</Text>
        ))}
        {hasMore && (
          <Text dimColor>... ({lines.length - 20} more lines)</Text>
        )}
      </Box>

      {status === 'applying' && (
        <Box marginTop={1}>
          <Text color="yellow">Applying change...</Text>
        </Box>
      )}

      {status === 'applied' && (
        <Box marginTop={1}>
          <Text color="green">✓ Change applied successfully!</Text>
        </Box>
      )}

      {status === 'copied' && (
        <Box marginTop={1}>
          <Text color="green">✓ Copied to clipboard!</Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          {status === 'viewing' && 'a: Apply | c: Copy to clipboard | q: Back'}
          {status === 'applied' && 'q: Back'}
        </Text>
      </Box>
    </Box>
  );
}
