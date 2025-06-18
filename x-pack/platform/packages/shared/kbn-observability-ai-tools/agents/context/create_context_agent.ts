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

export function createContextAgent({}: AssistantAgentRegistrationParameters): AssistantAgent {
  return {
    description: `The context agent searches the organization’s knowledge base, product documentation and other indexed content to locate relevant documentation, runbooks, and troubleshooting guides. It can aggregate sources, summarize findings, and link to detailed articles. Use this agent when you require background information, best practices, or precedent solutions for observability challenges. Frame your prompt by specifying the topic or question, mention any particular document collections or tags to prioritize, and indicate the format you prefer (for example, summary, code snippet, or detailed walkthrough).`,
    prompt: (input) => {},
  };
}
