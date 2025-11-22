/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import copy from 'copy-to-clipboard';
import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import type { ActionContext } from '../types';

interface DescribeDatasetProps {
  context: ActionContext;
  onBack: () => void;
}

export function DescribeDataset({ context, onBack }: DescribeDatasetProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'copied'>('loading');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<any>(null);

  useEffect(() => {
    const loadDescription = async () => {
      try {
        setStatus('loading');
        const analysis = await describeDataset({
          esClient: context.esClient,
          index: context.stream.name,
          start: context.start,
          end: context.end,
        });
        
        setFullAnalysis(analysis);
        const formatted = formatDocumentAnalysis(analysis);
        setDescription(formatted);
        setStatus('ready');
      } catch (err) {
        setError((err as Error).message);
        setStatus('ready');
      }
    };

    loadDescription();
  }, [context]);

  useInput((input) => {
    if (status === 'ready') {
      if (input === 'c') {
        copy(description);
        setStatus('copied');
        setTimeout(() => setStatus('ready'), 2000);
      } else if (input === 'f' && fullAnalysis) {
        copy(JSON.stringify(fullAnalysis, null, 2));
        setStatus('copied');
        setTimeout(() => setStatus('ready'), 2000);
      } else if (input === 'q') {
        onBack();
      }
    }
  });

  if (status === 'loading') {
    return (
      <Box>
        <Text color="yellow">Analyzing dataset...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press q to go back</Text>
        </Box>
      </Box>
    );
  }

  const lines = description.split('\n');
  const displayLines = lines.slice(0, 20);
  const hasMore = lines.length > 20;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Dataset Description: {context.stream.name}
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

      {status === 'copied' && (
        <Box marginTop={1}>
          <Text color="green">✓ Copied to clipboard!</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>c: Copy formatted | f: Copy full analysis | q: Back</Text>
      </Box>
    </Box>
  );
}
