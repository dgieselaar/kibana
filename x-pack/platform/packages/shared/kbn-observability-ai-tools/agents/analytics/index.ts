/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AssistantAgent,
  AssistantAgentRegistrationParameters,
} from '@kbn/observability-ai-assistant-common';
import { answerAsEsqlExpert } from '@kbn/ai-tools';

export function createAnalyticsAgent({
  clusterClient,
  inferenceClient,
  logger,
  signal,
}: AssistantAgentRegistrationParameters): AssistantAgent {
  return {
    description: `The analytics agent leverages the Elasticsearch Query Language (ES|QL) and introspects data streams and index mappings to validate, generate, and visualize time series data. It can automatically explore available data streams and mappings to identify the most relevant metrics or data sets, craft ES|QL queries, simulate expected output structures, and produce visual representations of those metrics or logs. Use this agent when you need to uncover trends, confirm data integrity, or generate dashboards from observability data. Supply the agent with a natural language prompt that outlines your high-level objective—such as monitoring latency or error rates—or specifies a particular index or metric when known; the agent will then determine the necessary indices, fields, time window, and aggregations required.`,
    prompt: (input) => {
      return answerAsEsqlExpert({
        esClient: clusterClient.asCurrentUser,
        inferenceClient,
        logger,
        signal,
        prompt: input,
      });
    },
  };
}
