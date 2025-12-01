/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAsInvestigationAgent } from '@kbn/observability-agents';
import { Box, Text, useInput } from 'ink';
import React, { useCallback, useRef, useState } from 'react';
import { withActiveInferenceSpan } from '@kbn/inference-tracing';
import { Input } from '../components/input';
import { useAppState } from '../state/use_app_state';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface InvestigateProps {}

export function Investigate({}: InvestigateProps) {
  const { state, context } = useAppState();

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const investigate = useCallback(
    (kql: string, signal?: AbortSignal) => {
      return withActiveInferenceSpan('Workflow', () => {
        return executeAsInvestigationAgent({
          start: state.timeRange.start,
          end: state.timeRange.end,
          esClient: context.esClient,
          inferenceClient: context.inferenceClient,
          kql,
          logger: context.logger,
          signal: signal ?? context.signal,
        });
      });
    },
    [state.timeRange, context.esClient, context.inferenceClient, context.logger, context.signal]
  );

  useInput((input, key) => {
    if (isLoading) {
      if (input === 'c' || key.escape) {
        abortControllerRef.current?.abort();
      }
    }
  });

  const onSubmit = useCallback(
    async (kql: string) => {
      // Cancel any previous run first
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const data = await investigate(kql, controller.signal);
        setResult(data);
      } catch (err) {
        if (err?.name === 'AbortError') {
          setError(null);
        } else {
          setError(err?.message || 'Unknown error');
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [investigate]
  );

  return (
    <Box flexDirection="column">
      <Input
        prompt="KQL filter"
        onSubmit={(val) => {
          onSubmit(val);
        }}
        onCancel={() => {
          if (isLoading) abortControllerRef.current?.abort();
        }}
        placeholder={`e.g. service.name: "web" and status: error"`}
        resetOnSubmit={false}
      />
      <Box marginTop={1}>
        {isLoading ? (
          <Text>Running investigation... Press &quot;c&quot; or ESC to cancel.</Text>
        ) : (
          <Text>Press Enter to start investigation.</Text>
        )}
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}
      {result ? (
        <Box marginTop={1} flexDirection="column">
          <Text>Results:</Text>
          <Text>{JSON.stringify(result, null, 2)}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
