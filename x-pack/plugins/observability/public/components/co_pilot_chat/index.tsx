/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ChatCompletionRequestMessage, ChatCompletionResponseMessage } from 'openai';
import React, { useEffect, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { Observable } from 'rxjs';
import { CreateChatCompletionResponseChunk } from '../../../common/co_pilot';
import { ChatResponseObservable } from '../../../common/co_pilot/streaming_chat_response_observable';
import { useCoPilot } from '../../hooks/use_co_pilot';
import { CoPilotChatViewType } from '../../typings/co_pilot';
import { useKibana } from '../../utils/kibana_react';
import { CoPilotChatConversation } from './co_pilot_chat_conversation';
import { CoPilotChatList } from './co_pilot_chat_list';
import { CoPilotCreateChatButton } from './co_pilot_create_chat_button';

export function CoPilotChat() {
  const coPilot = useCoPilot();

  if (!coPilot) {
    throw new Error('CoPilot service not available in context');
  }

  const {
    services: { notifications },
  } = useKibana();

  const [inflightRequest, setInflightRequest] = useState<string | undefined>(undefined);

  const [response$, setResponse$] = useState<ChatResponseObservable | undefined>(undefined);

  const [conversation, reloadConversation] = useAsyncFn(() => {
    if (!coPilot.conversationId) {
      return Promise.resolve(null);
    }
    return coPilot.loadConversation(coPilot.conversationId).catch((error) => {
      notifications.showErrorDialog({
        title: i18n.translate('xpack.observability.coPilotChat.failedLoadingConversation', {
          defaultMessage: 'Failed to load conversation',
        }),
        error,
      });
      throw error;
    });
  }, [coPilot.conversationId]);

  const [conversations, reloadConversations] = useAsyncFn(() => {
    return coPilot
      .listConversations(100)
      .then((next) => next.conversations)
      .catch((error) => {
        notifications.showErrorDialog({
          title: i18n.translate('xpack.observability.coPilotChat.failedLoadingConversations', {
            defaultMessage: 'Failed to load list of conversations',
          }),
          error,
        });
        throw error;
      });
  }, []);

  useEffect(() => {
    if (coPilot.isOpen && coPilot.viewType === CoPilotChatViewType.List) {
      reloadConversations();
    }
  }, [coPilot.isOpen, coPilot.viewType, reloadConversations]);

  useEffect(() => {
    if (coPilot.isOpen) {
      reloadConversation().then(() => {
        setInflightRequest(undefined);
        setResponse$(undefined);
      });
    }
  }, [coPilot.isOpen, coPilot.conversationId, reloadConversation]);

  return coPilot.isOpen ? (
    <EuiFlyout
      onClose={() => {
        coPilot.close();
      }}
      size="m"
      closeButtonPosition="outside"
      closeButtonProps={{
        size: 's',
      }}
      style={{ display: 'flex' }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup>
          <EuiFlexItem
            css={`
              align-self: center;
            `}
            grow
          >
            {coPilot.viewType !== CoPilotChatViewType.List ? (
              <>
                <EuiLink
                  data-test-subj="CoPilotChatConversationLink"
                  onClick={() => {
                    coPilot.showList();
                  }}
                >
                  <EuiFlexGroup direction="row" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="arrowLeft" />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        {i18n.translate('xpack.observability.coPilotChat.backLinkTitle', {
                          defaultMessage: 'Back to conversations',
                        })}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiLink>
                <EuiSpacer size="xs" />
              </>
            ) : undefined}
            <EuiTitle size={coPilot.viewType === CoPilotChatViewType.List ? 'm' : 's'}>
              <h2
                css={css`
                  white-space: nowrap;
                `}
              >
                {coPilot.viewType === CoPilotChatViewType.Conversation ? (
                  conversation?.loading ? (
                    <EuiLoadingSpinner size="s" />
                  ) : (
                    conversation?.value?.conversation.conversation.title ||
                    i18n.translate('xpack.observability.coPilot.newChatPlaceholderTitle', {
                      defaultMessage: 'New chat',
                    })
                  )
                ) : (
                  i18n.translate('xpack.observability.coPilotChat.conversationsListTitle', {
                    defaultMessage: 'Conversations',
                  })
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <CoPilotCreateChatButton coPilot={coPilot} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflow {
            display: flex;
            flex: 1;
          }
          .euiFlyoutBody__overflowContent {
            display: flex;
            flex: 1;
            padding: 0;
          }
        `}
      >
        {coPilot.viewType === CoPilotChatViewType.Conversation ? (
          <CoPilotChatConversation
            onSubmit={async (input) => {
              let observable$: ChatResponseObservable = new Observable<
                CreateChatCompletionResponseChunk[]
              >();

              setInflightRequest(input);

              setResponse$(observable$);

              const newMessages: ChatCompletionRequestMessage[] = [];

              try {
                let isNew = false;
                let conversationId = coPilot.conversationId;
                if (!conversationId) {
                  const { conversation: nextConversation } = await coPilot.createConversation();
                  conversationId = nextConversation.conversation.id;
                  isNew = true;
                  newMessages.push({
                    content:
                      "You are a helpful assistant for the Elastic APM product. Your users might be SREs or application developers who need help debugging a performance regression or a stability issue. Assume problems should be solved within the context of the Elastic APM app. You're talking to experienced professionals so don't baby them on basics. Some important field names are 'service.name', 'service.environment' (usually something like 'production', 'development', 'testing', 'qa') and 'service.version' (all keyword fields). Hosts are uniquely identified by `service.node.name`. For transactions and spans, 'event.outcome' describes whether the event was succesful or not. 'event.duration' describes how long the event took. For transaction data, we have 'transaction.type' (usually 'request' or 'page load'). For exit span data, there is 'span.destination.service.resource', which defines the name of the downstream target of the exit span. Don't suggest a function if you're not sure on what to call it with, and don't name it. Instead, ask the user for clarification or additional context.",
                    role: 'system',
                  });
                }

                newMessages.push({ content: input, role: 'user' });

                observable$ = coPilot.chat(
                  (conversation.value?.messages ?? [])
                    .map((msg) => {
                      const { order, ...rest } = msg.message;
                      return rest;
                    })
                    .concat(newMessages)
                );

                setResponse$(observable$);

                const reply = await new Promise<
                  Pick<ChatCompletionResponseMessage, 'content' | 'function_call'>
                >((resolve, reject) => {
                  let choice = {
                    function_call: { arguments: '', name: '' },
                    content: '',
                  };

                  observable$.subscribe({
                    next: (chunks) => {
                      choice = { function_call: { arguments: '', name: '' }, content: '' };

                      chunks.forEach((chunk) => {
                        const delta = chunk.choices[0].delta;
                        choice.content += delta.content ?? '';
                        choice.function_call.arguments += delta.function_call?.arguments ?? '';
                        choice.function_call.name += delta.function_call?.name ?? '';
                      });
                    },
                    complete: () => {
                      console.log('completing');
                      resolve(choice);
                    },
                    error: (err) => {
                      reject(err);
                    },
                  });
                });

                await coPilot.append(
                  conversationId,
                  newMessages.concat({
                    ...(reply.content
                      ? { content: reply.content }
                      : { function_call: reply.function_call, content: '' }),
                    role: 'assistant' as const,
                  })
                );

                if (isNew) {
                  try {
                    await coPilot.autoTitleConversation(conversationId);
                  } catch (err: any) {
                    console.warn(`Couldn\'t auto-update title`);
                    console.warn(err);
                  }
                }

                coPilot.openConversation(conversationId);
              } catch (error) {
                notifications.showErrorDialog({
                  title: i18n.translate('xpack.observability.coPilotChat.failedToSubmit', {
                    defaultMessage: 'Could not update conversation',
                  }),
                  error,
                });
                throw error;
              }
            }}
            loading={conversation.loading}
            conversation={conversation.value?.conversation}
            messages={conversation.value?.messages.filter(
              (message) => message.message.role !== 'system'
            )}
            response$={response$}
            inflightRequest={inflightRequest}
          />
        ) : (
          <CoPilotChatList
            coPilot={coPilot}
            loading={conversations.loading}
            conversations={conversations.value}
            error={conversations.error ? String(conversations.error) : undefined}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : null;
}
