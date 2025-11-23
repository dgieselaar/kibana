/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { BoundInferenceClient, InferenceConnector } from '@kbn/inference-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { KibanaClient } from '@kbn/kibana-api-cli';
import type { ConnectorsService } from './services/connectors_service';
import type { StreamsService } from './services/streams_service';
import type { HttpProcessingService } from './services/processing_service';

export interface StreamsAICLIRouteHandle {
  label: string;
}

interface FetchBase<T> {
  refresh(): Promise<T>;
}

interface FetchPending<T> extends FetchBase<T> {
  state: 'pending';
}

interface FetchResolved<T> extends FetchBase<T> {
  state: 'resolved';
  data: T;
}

interface FetchRejected<T> extends FetchBase<T> {
  state: 'rejected';
  error: Error;
}

type Fetch<T> = FetchPending<T> | FetchResolved<T> | FetchRejected<T>;

export interface AppState {
  connector: InferenceConnector;
  timeRange: TimeRange;
  streams: Fetch<{ streams: Streams.all.Definition[] }>;
  connectors: Fetch<{ connectors: InferenceConnector[] }>;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface TimeRange {
  option: TimeRangeOption;
  start: number;
  end: number;
}

export interface TimeRangeOption {
  id: string;
  label: string;
  value: string;
  isCustom?: boolean;
}

export interface AppContext {
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
  kibanaClient: KibanaClient;
  services: {
    connectors: ConnectorsService;
    streams: StreamsService;
    processing: HttpProcessingService;
  };
}
