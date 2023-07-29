/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import { omit } from 'lodash';
import { type ConversationCreateRequest, MessageRole, type Message } from '../../../common/types';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { ChatHeader } from './chat_header';
import { ChatTimeline } from './chat_timeline';
import { getTimelineItemsfromConversation } from '../../utils/get_timeline_items_from_conversation';
import type { UseChatResult } from '../../hooks/use_chat';
import { ChatPromptEditor } from './chat_prompt_editor';

function createNewConversation(): ConversationCreateRequest {
  return {
    '@timestamp': new Date().toISOString(),
    messages: [],
    conversation: {
      title: '',
    },
    labels: {},
    numeric_labels: {},
  };
}

export function ChatBody({
  initialConversation,
  connectors,
  currentUser,
  chat,
}: {
  initialConversation?: ConversationCreateRequest;
  connectors: UseGenAIConnectorsResult;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  chat: UseChatResult;
}) {
  const connectorId = connectors.selectedConnector;

  const hasConnector = !!connectorId;

  const [conversation, setConversation] = useState(initialConversation || createNewConversation());

  const conversationItems = useMemo(() => {
    return getTimelineItemsfromConversation({
      conversation,
      currentUser,
      hasConnector,
    });
  }, [conversation, currentUser, hasConnector]);

  const items = useMemo(() => {
    if (chat.loading) {
      return conversationItems.concat({
        id: '',
        canEdit: false,
        canRegenerate: false,
        canGiveFeedback: false,
        role: MessageRole.Assistant,
        title: '',
        content: chat.content ?? '',
        loading: true,
        currentUser,
      });
    }

    return conversationItems;
  }, [conversationItems, chat.content, chat.loading, currentUser]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <ChatHeader title="foo" connectors={connectors} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <ChatTimeline
            items={items}
            onEdit={() => {}}
            onFeedback={() => {}}
            onRegenerate={() => {
              if (!conversation) {
                return;
              }

              chat.generate({
                messages: conversation.messages,
                connectorId: connectors.selectedConnector!,
              });
            }}
            onStopGenerating={() => {}}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <ChatPromptEditor
            loading={chat.loading}
            disabled={!connectorId}
            onSubmit={async ({ content }) => {
              if (content && connectorId) {
                const nextMessage: Message = {
                  '@timestamp': new Date().toISOString(),
                  message: {
                    role: MessageRole.User,
                    content,
                  },
                };

                const messages = conversation.messages.concat(nextMessage);

                setConversation((conv) => ({ ...conv, messages }));

                await chat.generate({ messages, connectorId }).then((response) => {
                  const nextMessages = messages.concat({
                    '@timestamp': new Date().toISOString(),
                    message: {
                      role: MessageRole.Assistant,
                      ...omit(response, 'function_call'),
                      ...(response.function_call
                        ? {
                            function_call: {
                              ...response.function_call,
                              trigger: MessageRole.Assistant,
                            },
                          }
                        : {}),
                    },
                  });

                  setConversation((conv) => ({ ...conv, messages: nextMessages }));
                });
              }
            }}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
