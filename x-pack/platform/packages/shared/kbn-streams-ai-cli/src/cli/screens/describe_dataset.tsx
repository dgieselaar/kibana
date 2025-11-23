/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import type { Streams } from '@kbn/streams-schema';
import useAsync from 'react-use/lib/useAsync';
import { useGoBack } from '@kbn/ink/router';
import { useAppState } from '../state/use_app_state';
import { CopyBox } from '../components/copy_box';

interface DescribeDatasetProps {
  stream: Streams.all.Definition;
}

export function DescribeDataset({ stream }: DescribeDatasetProps) {
  const { context, state } = useAppState();

  useGoBack();

  const asyncResult = useAsync(async () => {
    return await describeDataset({
      esClient: context.esClient,
      index: stream.name,
      start: state.timeRange.start,
      end: state.timeRange.end,
    });
  }, []);

  const serialized = useMemo(() => {
    return asyncResult.value ? JSON.stringify(asyncResult.value) : undefined;
  }, [asyncResult.value]);

  const formatted = useMemo(() => {
    return asyncResult.value
      ? JSON.stringify(formatDocumentAnalysis(asyncResult.value), null, 2)
      : undefined;
  }, [asyncResult.value]);

  if (asyncResult.loading) {
    return (
      <Box>
        <Text color="yellow">Analyzing dataset...</Text>
      </Box>
    );
  }

  if (asyncResult.error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {asyncResult.error.message}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press q to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Dataset Description: {stream.name}
        </Text>
      </Box>

      <CopyBox copy={serialized} display={formatted ?? `Loading...`} />
    </Box>
  );
}
