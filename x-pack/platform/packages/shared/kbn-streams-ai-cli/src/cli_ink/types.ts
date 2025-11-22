/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { InferenceConnector } from '@kbn/inference-common';
import type { InferenceCliClient } from '@kbn/inference-cli';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { KibanaClient } from '@kbn/kibana-api-cli';

export interface AppState {
  connector?: InferenceConnector;
  stream?: Streams.ingest.all.Definition;
  timeRangeId: string;
  customTimeRange?: TimeRangeOption;
  streams: Streams.ingest.all.Definition[];
  breadcrumbs: string[];
  logs: LogEntry[];
  showingLogs: boolean;
  previousScreen?: string;
  currentScreen: Screen;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface TimeRangeOption {
  id: string;
  label: string;
  value: string;
  isCustom?: boolean;
}

export interface ActionContext {
  inferenceClient: InferenceCliClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  kibanaClient: KibanaClient;
  stream: Streams.ingest.all.Definition;
  start: number;
  end: number;
}

export interface WorkflowChange {
  change: unknown;
}

export interface StreamActionResult {
  label: string;
  description?: string;
  body: unknown;
}

export type Screen =
  | 'main-menu'
  | 'select-stream'
  | 'select-connector'
  | 'set-time-range'
  | 'show-logs'
  | 'stream-actions'
  | 'describe-dataset'
  | 'chat-with-data'
  | 'partition-stream'
  | 'onboard-menu'
  | 'analyze-stream'
  | 'workflow-result';

export interface AppContext {
  inferenceClient: InferenceCliClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  kibanaClient: KibanaClient;
}
