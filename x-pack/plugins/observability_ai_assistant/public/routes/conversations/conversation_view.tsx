/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { omit } from 'lodash';
import React, { useMemo, useState } from 'react';
import { MessageRole, type ConversationCreateRequest, type Message } from '../../../common/types';
import { ChatHeader } from '../../components/chat/chat_header';
import { ChatPromptEditor } from '../../components/chat/chat_prompt_editor';
import { ChatTimeline } from '../../components/chat/chat_timeline';
import { useChat } from '../../hooks/use_chat';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { getTimelineItemsfromConversation } from '../../utils/get_timeline_items_from_conversation';

export function ConversationView() {
  const connectors = useGenAIConnectors();

  const start = new Date().toISOString();

  const [conversation, setConversation] = useState<ConversationCreateRequest>({
    '@timestamp': start,
    messages: [],
    conversation: {
      title: '',
    },
    labels: {},
    numeric_labels: {},
  });

  const chat = useChat();

  const currentUser = useCurrentUser();

  const conversationItems = useMemo(() => {
    return getTimelineItemsfromConversation({ conversation, currentUser });
  }, [conversation, currentUser]);

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
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={false} />
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <ChatHeader title="foo" connectors={connectors} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <ChatTimeline
              items={items}
              onEdit={() => {}}
              onFeedback={() => {}}
              onRegenerate={() => {}}
              onStopGenerating={() => {}}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ChatPromptEditor
              loading={chat.loading}
              onSubmit={async ({ content }) => {
                const connectorId = connectors.selectedConnector!;
                if (content) {
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
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
