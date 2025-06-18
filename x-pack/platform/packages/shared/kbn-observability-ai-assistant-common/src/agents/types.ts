/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { BoundInferenceClient } from '@kbn/inference-common';

interface CitationAttachment {
  citation: {};
}

interface ReflectionAttachment {
  content: string;
}

type AssistantAttachment = CitationAttachment | ReflectionAttachment;

export interface AssistantAgentResponse {
  content: string;
  attachments?: AssistantAttachment[];
}

export interface AssistantAgent {
  description: string;
  prompt: (input: string) => Promise<AssistantAgentResponse>;
}

export interface AssistantAgentRegistrationParameters {
  clusterClient: IScopedClusterClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
}
