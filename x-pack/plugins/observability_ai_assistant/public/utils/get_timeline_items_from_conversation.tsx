/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { v4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { type Message, MessageRole } from '../../common';
import type { ChatTimelineItem } from '../components/chat/chat_timeline';
import { RenderFunction } from '../components/render_function';

export function getTimelineItemsfromConversation({
  currentUser,
  messages,
  hasConnector,
}: {
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  messages: Message[];
  hasConnector: boolean;
}): ChatTimelineItem[] {
  return [
    {
      id: v4(),
      role: MessageRole.User,
      title: i18n.translate('xpack.observabilityAiAssistant.conversationStartTitle', {
        defaultMessage: 'started a conversation',
      }),
      canCopy: false,
      canEdit: false,
      canExpand: false,
      canGiveFeedback: false,
      canRegenerate: false,
      hide: false,
      loading: false,
      currentUser,
    },
    ...messages.map((message, index) => {
      const hasFunction = !!message.message.function_call?.name;
      const isSystemPrompt = message.message.role === MessageRole.System;

      let title: string;
      let content: string | undefined;
      let element: React.ReactNode | undefined;

      if (hasFunction) {
        title = i18n.translate('xpack.observabilityAiAssistant.suggestedFunctionEvent', {
          defaultMessage: 'suggested to call {functionName}',
          values: {
            functionName: message.message.function_call!.name,
          },
        });
        content =
          '```\n' +
          JSON.stringify(
            {
              name: message.message.function_call!.name,
              arguments: JSON.parse(message.message.function_call?.arguments || ''),
            },
            null,
            4
          ) +
          '\n```';
      } else if (isSystemPrompt) {
        title = i18n.translate('xpack.observabilityAiAssistant.addedSystemPromptEvent', {
          defaultMessage: 'added a prompt',
        });
        content = '';
      } else if (message.message.name) {
        const prevMessage = messages[index - 1];
        if (!prevMessage || !prevMessage.message.function_call) {
          throw new Error('Could not find preceding message with function_call');
        }
        title = i18n.translate('xpack.observabilityAiAssistant.executedFunctionEvent', {
          defaultMessage: 'executed a function',
        });
        content = message.message.content;
        element = (
          <RenderFunction
            name={message.message.name}
            arguments={prevMessage.message.function_call.arguments}
            response={message.message}
          />
        );
      } else {
        title = '';
        content = message.message.content;
      }

      const props = {
        id: v4(),
        role: message.message.role,
        canCopy: true,
        canEdit: hasConnector && (message.message.role === MessageRole.User || hasFunction),
        canExpand: Boolean(message.message.name) || Boolean(message.message.function_call),
        canRegenerate: hasConnector && message.message.role === MessageRole.Assistant,
        canGiveFeedback: message.message.role === MessageRole.Assistant,
        loading: false,
        hide: Boolean(message.message.isAssistantSetupMessage),
        title,
        content,
        currentUser,
        element,
      };

      return props;
    }),
  ];
}
