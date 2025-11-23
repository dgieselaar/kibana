/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Streams } from '@kbn/streams-schema';
import type {
  StreamWorkflow,
  StreamWorkflowApplyResult,
  StreamWorkflowContext,
  StreamWorkflowGenerateResult,
  StreamWorkflowInput,
} from '@kbn/streams-ai';
import { Box, Text, useInput } from 'ink';
import { useGoBack } from '@kbn/ink/router';
import { useAppState } from '../state/use_app_state';
import { useCopyableOutput } from '../hooks/use_copyable_output';

interface WorkflowDetailProps {
  stream: Streams.all.Definition;
  workflow: StreamWorkflow;
  label: string;
}

interface WorkflowStateEmpty {
  context?: undefined;
  input?: undefined;
  generateResult?: undefined;
  applyResult?: undefined;
  error?: undefined;
}

interface WorkflowStatePending {
  context: StreamWorkflowContext;
  input: StreamWorkflowInput;
  generateResult?: undefined;
  applyResult?: undefined;
  error?: undefined;
}

interface WorkflowStateGenerated {
  context: StreamWorkflowContext;
  input: StreamWorkflowInput;
  generateResult: StreamWorkflowGenerateResult;
  applyResult?: undefined;
  error?: undefined;
}

interface WorkflowStateApplied {
  context: StreamWorkflowContext;
  input: StreamWorkflowInput;
  generateResult: StreamWorkflowGenerateResult;
  applyResult: StreamWorkflowApplyResult;
  error?: undefined;
}

interface WorkflowStateError {
  context?: undefined;
  input?: undefined;
  generateResult?: undefined;
  applyResult?: undefined;
  error: Error;
}

type WorkflowState =
  | WorkflowStateEmpty
  | WorkflowStatePending
  | WorkflowStateGenerated
  | WorkflowStateApplied
  | WorkflowStateError;

export function WorkflowDetail({ workflow, stream, label }: WorkflowDetailProps) {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({});

  const { context, state } = useAppState();

  useGoBack();

  const output = useMemo(() => {
    if (workflowState.generateResult) {
      return {
        display: JSON.stringify(workflowState.generateResult.change, null, 2),
        copy: JSON.stringify(workflowState.generateResult, null, 2),
      };
    }
  }, [workflowState.generateResult]);

  useCopyableOutput(output?.copy);

  useEffect(() => {
    const workflowContext: StreamWorkflowContext = {
      start: state.timeRange.start,
      end: state.timeRange.end,
      esClient: context.esClient,
      inferenceClient: context.inferenceClient,
      logger: context.logger,
      signal: context.signal,
      services: {
        streams: {
          processing: context.services.processing,
        },
      },
    };

    const workflowInput: StreamWorkflowInput = { stream: { definition: stream } };

    setWorkflowState((prev) => {
      return {
        input: workflowInput,
        context: workflowContext,
      };
    });

    workflow
      .generate(workflowContext, workflowInput)
      .then((generateResult) => {
        setWorkflowState(() => {
          return {
            context: workflowContext,
            input: workflowInput,
            generateResult,
          };
        });
      })
      .catch((error) => {
        setWorkflowState((prev) => ({
          error,
        }));
      });
  }, [workflow, stream, state.timeRange.start, state.timeRange.end, context]);

  const applyWorkflow = useCallback(() => {
    if (workflowState.context && workflowState.input && workflowState.generateResult) {
      workflow
        .apply(workflowState.context, workflowState.input, workflowState.generateResult.change)
        .then((applyResult) => {
          setWorkflowState(() => {
            return {
              context: workflowState.context,
              input: workflowState.input,
              generateResult: workflowState.generateResult,
              applyResult,
            };
          });
        });
    }
  }, [workflowState.context, workflowState.input, workflowState.generateResult, workflow]);

  // Inline interaction: Apply (a), Copy (c), Back (q)
  useInput(async (input) => {
    if (input === 'a') {
      await applyWorkflow();
    } else if (input === 'c' && workflowState.generateResult) {
      const json = JSON.stringify(workflowState.generateResult.change, null, 2);
      navigator.clipboard?.writeText?.(json);
    }
  });

  if (workflowState.error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {workflowState.error.message}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press q to go back</Text>
        </Box>
      </Box>
    );
  }

  if (!workflowState.generateResult) {
    return (
      <Box>
        <Text color="yellow">Generating workflow: {label} ...</Text>
      </Box>
    );
  }

  const changeStr = JSON.stringify(workflowState.generateResult.change, null, 2);
  const lines = changeStr.split('\n');
  const displayLines = lines.slice(0, 20);
  const hasMore = lines.length > 20;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {label} - Generated Change
        </Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        {displayLines.map((line, idx) => (
          <Text key={idx}>{line}</Text>
        ))}
        {hasMore && <Text dimColor>... ({lines.length - 20} more lines)</Text>}
      </Box>
      {workflowState.applyResult ? (
        <Box marginTop={1}>
          <Text color="green">✓ Change applied successfully!</Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text dimColor>a: Apply | c: Copy to clipboard | q: Back</Text>
        </Box>
      )}
    </Box>
  );
}
