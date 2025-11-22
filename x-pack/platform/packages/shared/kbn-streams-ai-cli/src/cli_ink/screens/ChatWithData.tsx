/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Input } from '../components/Input';
import { executeAsEsqlAgent } from '@kbn/ai-tools';
import { withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { ActionContext } from '../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWithDataProps {
  context: ActionContext;
  onBack: () => void;
}

export function ChatWithData({ context, onBack }: ChatWithDataProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: string) => {
    if (input === '/back' || input === '/quit') {
      onBack();
      return;
    }

    if (input === '/clear') {
      setMessages([]);
      setError(null);
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);
    setError(null);

    try {
      const response = await withActiveInferenceSpan('Answer', { root: true }, () =>
        executeAsEsqlAgent({
          inferenceClient: context.inferenceClient,
          esClient: context.esClient,
          start: context.start,
          end: context.end,
          signal: context.signal,
          prompt: `Based on the data in the stream \`${context.stream.name}\`, answer the following question directly to the user:
          
          ${input}`,
          logger: context.logger,
        })
      );

      const assistantMessage: ChatMessage = { role: 'assistant', content: response.content };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Chat with {context.stream.name}
        </Text>
        <Text dimColor> (Type /back to exit, /clear to reset)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1} height={15}>
        {messages.slice(-10).map((msg, index) => (
          <Box key={index} marginBottom={1}>
            <Text bold color={msg.role === 'user' ? 'blue' : 'green'}>
              {msg.role === 'user' ? 'You' : 'Assistant'}:{' '}
            </Text>
            <Text>{msg.content}</Text>
          </Box>
        ))}
        {isProcessing && (
          <Box>
            <Text color="yellow">Processing...</Text>
          </Box>
        )}
        {error && (
          <Box>
            <Text color="red">Error: {error}</Text>
          </Box>
        )}
      </Box>

      {!isProcessing && (
        <Input
          prompt="Your question:"
          placeholder="Ask about the data..."
          onSubmit={handleSubmit}
          onBack={onBack}
        />
      )}
    </Box>
  );
}
