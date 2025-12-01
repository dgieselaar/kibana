/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis } from '@kbn/ai-tools';
import type { Streams } from '@kbn/streams-schema';
import type {
  StreamWorkflowApplyResult,
  StreamWorkflowGenerateResult,
  StreamWorkflowInput,
} from '../types';

export interface AnalyzeStreamWorkflowInput extends StreamWorkflowInput<Streams.all.Model> {
  analysis: DocumentAnalysis;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AnalyzeStreamWorkflowChange {}

export type AnalyzeStreamWorkflowGenerateResult =
  StreamWorkflowGenerateResult<AnalyzeStreamWorkflowChange>;

export type AnalyzeStreamWorkflowApplyResult = StreamWorkflowApplyResult<Streams.all.Model>;
