/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { describeDataset } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { inspectSystem } from '../../prompts/inspect_system/inspect_system';
import { extractKeyMetrics } from './extract_key_metrics';
import { extractLogPatterns } from './extract_log_patterns';
import { getSignalDefinitions } from './get_signal_definitions';
import { getSignals } from './get_signals';

export async function executeAsInvestigationAgent({
  start,
  end,
  index = ['*', '*:*'],
  kql,
  inferenceClient,
  esClient,
  logger,
  signal,
}: {
  start: number;
  end: number;
  index?: string | string[];
  kql: string;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
}) {
  const [analysis, signalDefinitions] = await Promise.all([
    describeDataset({
      esClient,
      start,
      end,
      index: ['*', '*:*'],
      kql,
    }),
    getSignalDefinitions({
      kql,
    }),
  ]);

  const [keyMetrics, logPatterns, signals] = await Promise.all([
    extractKeyMetrics({
      start,
      end,
      kql,
      index,
      inferenceClient,
      esClient,
      logger,
      signal,
      analysis,
      anomalyDetectionJobs: signalDefinitions.anomalyDetectionJobs,
      rules: signalDefinitions.rules,
      sloDefinitions: signalDefinitions.sloDefinitions,
    }),
    extractLogPatterns({
      start,
      end,
      index,
      kql,
      esClient,
      logger,
      signal,
      inferenceClient,
      size: 30,
    }),
    getSignals({
      kql,
    }),
  ]);

  const diagnosis = await inspectSystem({
    esClient,
    logger,
    inferenceClient,
    signal,
    input: {
      alerts: signals.alerts,
      anomalies: signals.anomalies,
      key_metrics: keyMetrics,
      kql,
      log_patterns: logPatterns,
      slos: signals.slos,
    },
  });

  return diagnosis;
}
