/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Box, useApp, useInput } from 'ink';
import { InferenceChatModel } from '@kbn/inference-langchain';
import type { InferenceConnector } from '@kbn/inference-common';
import { Header } from './components/Header';
import { LogsDisplay } from './components/LogsDisplay';
import { MainMenu } from './screens/MainMenu';
import { SelectStream } from './screens/SelectStream';
import { SelectConnector } from './screens/SelectConnector';
import { SetTimeRange } from './screens/SetTimeRange';
import { StreamActions } from './screens/StreamActions';
import { OnboardingMenu } from './screens/OnboardingMenu';
import { DescribeDataset } from './screens/DescribeDataset';
import { ChatWithData } from './screens/ChatWithData';
import { AnalyzeStream } from './screens/AnalyzeStream';
import { WorkflowResult } from './screens/WorkflowResult';
import type { AppState, AppContext, Screen } from './types';
import { LogBuffer } from './utils/log_buffer';
import { DEFAULT_TIME_RANGE, getTimeRangeById, computeTimeRangeBounds } from './utils/time_ranges';
import type { Streams } from '@kbn/streams-schema';
import { partitionStreamWorkflow } from '@kbn/streams-ai/src/workflows/partition_stream/partition_stream_workflow';
import { onboardStreamWorkflow } from '@kbn/streams-ai/src/workflows/onboarding/onboard_stream_workflow';
import {
  onboardAnomalyDetectionJobsWorkflow,
  onboardDashboardsWorkflow,
  onboardFieldDefinitionsWorkflow,
  generateNaturalLanguageQueriesWorkflow,
  onboardProcessingWorkflow,
  onboardRulesWorkflow,
  onboardSLOsWorkflow,
} from '@kbn/streams-ai/src/workflows/onboarding/onboarding_workflows';

interface AppProps {
  context: AppContext;
  logBuffer: LogBuffer;
}

interface WorkflowState {
  workflow: any;
  change: unknown;
  input: any;
  context: any;
}

export function App({ context, logBuffer }: AppProps) {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>({
    timeRangeId: DEFAULT_TIME_RANGE.id,
    streams: [],
    breadcrumbs: ['Main Menu'],
    logs: [],
    showingLogs: false,
    currentScreen: 'main-menu',
  });
  
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [activeInferenceClient, setActiveInferenceClient] = useState(context.inferenceClient);

  // Global key handler for 'l' to show logs and CMD+C to exit
  useInput((input, key) => {
    if (input === 'l' && !state.showingLogs) {
      setState((prev) => ({
        ...prev,
        showingLogs: true,
        previousScreen: prev.currentScreen,
        logs: logBuffer.getLogs(),
      }));
    }

    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  // Update logs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.showingLogs) {
        setState((prev) => ({
          ...prev,
          logs: logBuffer.getLogs(),
        }));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [state.showingLogs, logBuffer]);

  const handleNavigate = (screen: Screen, breadcrumb?: string) => {
    const newBreadcrumbs = breadcrumb
      ? [...state.breadcrumbs, breadcrumb]
      : state.breadcrumbs.slice(0, 1);
    
    setState((prev) => ({
      ...prev,
      currentScreen: screen,
      breadcrumbs: newBreadcrumbs,
    }));
  };

  const handleBack = () => {
    if (state.showingLogs && state.previousScreen) {
      setState((prev) => ({
        ...prev,
        showingLogs: false,
        currentScreen: prev.previousScreen as Screen,
        previousScreen: undefined,
      }));
    } else {
      const newBreadcrumbs = state.breadcrumbs.slice(0, -1);
      const previousScreen = getPreviousScreen(state.breadcrumbs);
      
      setState((prev) => ({
        ...prev,
        currentScreen: previousScreen,
        breadcrumbs: newBreadcrumbs.length > 0 ? newBreadcrumbs : ['Main Menu'],
      }));
    }
  };

  const getPreviousScreen = (breadcrumbs: string[]): Screen => {
    if (breadcrumbs.length <= 1) return 'main-menu';
    const prev = breadcrumbs[breadcrumbs.length - 2];
    
    if (prev === 'Main Menu') return 'main-menu';
    if (prev.includes('Stream')) return 'stream-actions';
    if (prev === 'Onboard Stream') return 'onboard-menu';
    return 'main-menu';
  };

  const handleStreamSelect = (stream: Streams.ingest.all.Definition) => {
    setState((prev) => ({
      ...prev,
      stream,
      currentScreen: 'stream-actions',
      breadcrumbs: ['Main Menu', `Stream: ${stream.name}`],
    }));
  };

  const handleRefreshStreams = async () => {
    const response = await context.kibanaClient.fetch<{
      streams: Streams.ingest.all.Definition[];
    }>('/api/streams', {
      method: 'GET',
    });

    setState((prev) => ({
      ...prev,
      streams: response.streams || [],
    }));

    logBuffer.add('info', `Refreshed streams list: ${response.streams?.length || 0} streams found`);
  };

  const handleConnectorSelect = (connector: InferenceConnector) => {
    setState((prev) => ({
      ...prev,
      connector,
    }));

    const rebound = context.inferenceClient.bindTo({
      connectorId: connector.connectorId,
      functionCalling: 'auto',
    });

    const newClient = {
      ...rebound,
      getLangChainChatModel: () =>
        new InferenceChatModel({
          connector,
          chatComplete: rebound.chatComplete,
          signal: context.signal,
        }),
    };

    setActiveInferenceClient(newClient);
    logBuffer.add('info', `Selected connector: ${connector.name} (${connector.connectorId})`);
    handleBack();
  };

  const handleTimeRangeSelect = (timeRangeId: string, customRange?: import('./utils/time_ranges').TimeRangeOption) => {
    setState((prev) => ({
      ...prev,
      timeRangeId,
      customTimeRange: customRange,
    }));
    
    const timeRange = getTimeRangeById(timeRangeId, customRange);
    logBuffer.add('info', `Selected time range: ${timeRange.label}`);
    handleBack();
  };

  const handleStreamAction = async (action: string) => {
    if (action === 'partition-stream') {
      await handleWorkflowSelect('partition-stream');
    } else {
      handleNavigate(action as Screen, action.replace('-', ' '));
    }
  };

  const handleWorkflowSelect = async (workflowId: string) => {
    if (!state.stream) return;

    const timeRange = getTimeRangeById(state.timeRangeId, state.customTimeRange);
    const { start, end } = computeTimeRangeBounds(timeRange);

    const workflowContext = {
      inferenceClient: activeInferenceClient as any,
      esClient: context.esClient,
      logger: context.logger,
      signal: context.signal,
      start,
      end,
      services: {
        streams: {
          updateStream: async () => state.stream as any,
          processing: { generatePipeline: async () => ({}) } as any,
        },
      },
    };

    const workflowInput = {
      stream: { definition: state.stream },
    };

    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      logBuffer.add('error', `Workflow '${workflowId}' is not implemented yet`);
      return;
    }

    try {
      logBuffer.add('info', `Generating workflow: ${workflowId}`);
      const result = await workflow.generate(workflowContext, workflowInput);
      setWorkflowState({ workflow, change: result.change, input: workflowInput, context: workflowContext });
      handleNavigate('workflow-result', workflow.label);
    } catch (err) {
      logBuffer.add('error', `Workflow failed: ${(err as Error).message}`);
    }
  };

  const handleWorkflowApply = async () => {
    if (!workflowState || !state.stream) return;

    try {
      await workflowState.workflow.apply(
        workflowState.context,
        workflowState.input,
        workflowState.change
      );
      logBuffer.add('info', 'Workflow applied successfully');
    } catch (err) {
      logBuffer.add('error', `Workflow apply failed: ${(err as Error).message}`);
      throw err;
    }
  };

  // Initial load of streams and connector
  useEffect(() => {
    handleRefreshStreams().catch((err) => {
      logBuffer.add('error', `Failed to load streams: ${err.message}`);
    });

    const loadInitialConnector = async () => {
      try {
        const connectorId = context.inferenceClient.getConnectorId();
        const connector = await context.inferenceClient.getConnectorById(connectorId);
        setState((prev) => ({ ...prev, connector }));
      } catch (err) {
        logBuffer.add('warn', `Unable to determine active connector: ${(err as Error).message}`);
      }
    };

    loadInitialConnector();
  }, []);

  const getWorkflow = (workflowId: string) => {
    const workflows: Record<string, any> = {
      'full-flow': {
        label: 'Full Onboarding Flow',
        generate: onboardStreamWorkflow.generate,
        apply: onboardStreamWorkflow.apply,
      },
      'partition-stream': {
        label: 'Partition Stream',
        generate: partitionStreamWorkflow.generate,
        apply: partitionStreamWorkflow.apply,
      },
      'description': {
        label: 'Description',
        generate: onboardStreamWorkflow.generate,
        apply: onboardStreamWorkflow.apply,
      },
      'anomaly-detection': {
        label: 'Anomaly Detection',
        generate: onboardAnomalyDetectionJobsWorkflow.generate,
        apply: onboardAnomalyDetectionJobsWorkflow.apply,
      },
      'dashboards': {
        label: 'Dashboards',
        generate: onboardDashboardsWorkflow.generate,
        apply: onboardDashboardsWorkflow.apply,
      },
      'nl-queries': {
        label: 'Natural Language Queries',
        generate: generateNaturalLanguageQueriesWorkflow.generate,
        apply: generateNaturalLanguageQueriesWorkflow.apply,
      },
      'processing': {
        label: 'Processing',
        generate: onboardProcessingWorkflow.generate,
        apply: onboardProcessingWorkflow.apply,
      },
      'rules': {
        label: 'Rules',
        generate: onboardRulesWorkflow.generate,
        apply: onboardRulesWorkflow.apply,
      },
      'slos': {
        label: 'SLOs',
        generate: onboardSLOsWorkflow.generate,
        apply: onboardSLOsWorkflow.apply,
      },
      'field-definitions': {
        label: 'Field Definitions',
        generate: onboardFieldDefinitionsWorkflow.generate,
        apply: onboardFieldDefinitionsWorkflow.apply,
      },
    };

    return workflows[workflowId];
  };

  const handleExit = () => {
    exit();
  };

  const timeRange = getTimeRangeById(state.timeRangeId, state.customTimeRange);
  const { start, end } = computeTimeRangeBounds(timeRange);

  const actionContext = state.stream ? {
    inferenceClient: activeInferenceClient,
    esClient: context.esClient,
    logger: context.logger,
    signal: context.signal,
    kibanaClient: context.kibanaClient,
    stream: state.stream,
    start,
    end,
  } : undefined;

  return (
    <Box flexDirection="column">
      <Header state={state} />
      <Box marginTop={1}>
        {state.showingLogs ? (
          <LogsDisplay logs={state.logs} onBack={handleBack} />
        ) : state.currentScreen === 'main-menu' ? (
          <MainMenu onNavigate={handleNavigate} onExit={handleExit} />
        ) : state.currentScreen === 'select-stream' ? (
          <SelectStream
            streams={state.streams}
            currentStream={state.stream}
            kibanaClient={context.kibanaClient}
            onSelect={handleStreamSelect}
            onRefresh={handleRefreshStreams}
            onBack={handleBack}
          />
        ) : state.currentScreen === 'select-connector' ? (
          <SelectConnector
            kibanaClient={context.kibanaClient}
            currentConnector={state.connector}
            onSelect={handleConnectorSelect}
            onBack={handleBack}
          />
        ) : state.currentScreen === 'set-time-range' ? (
          <SetTimeRange
            currentTimeRangeId={state.timeRangeId}
            onSelect={handleTimeRangeSelect}
            onBack={handleBack}
          />
        ) : state.currentScreen === 'stream-actions' ? (
          <StreamActions onNavigate={handleStreamAction} onBack={handleBack} />
        ) : state.currentScreen === 'onboard-menu' ? (
          <OnboardingMenu onSelectWorkflow={handleWorkflowSelect} onBack={handleBack} />
        ) : state.currentScreen === 'describe-dataset' && actionContext ? (
          <DescribeDataset context={actionContext} onBack={handleBack} />
        ) : state.currentScreen === 'chat-with-data' && actionContext ? (
          <ChatWithData context={actionContext} onBack={handleBack} />
        ) : state.currentScreen === 'analyze-stream' && actionContext ? (
          <AnalyzeStream context={actionContext} onBack={handleBack} />
        ) : state.currentScreen === 'workflow-result' && workflowState ? (
          <WorkflowResult
            workflowName={workflowState.workflow.label}
            change={workflowState.change}
            onApply={handleWorkflowApply}
            onBack={handleBack}
          />
        ) : null}
      </Box>
    </Box>
  );
}
