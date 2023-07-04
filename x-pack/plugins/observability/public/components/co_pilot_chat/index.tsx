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
import React, { useCallback, useEffect, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { Observable } from 'rxjs';
import {
  CoPilotConversation,
  CoPilotConversationMessage,
  CreateChatCompletionResponseChunk,
} from '../../../common/co_pilot';
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

  const loadConversation = useCallback(
    (conversationId: string) => {
      return coPilot
        .loadConversation(conversationId)
        .catch((error) => {
          notifications.showErrorDialog({
            title: i18n.translate('xpack.observability.coPilotChat.failedLoadingConversation', {
              defaultMessage: 'Failed to load conversation',
            }),
            error,
          });
          throw error;
        })
        .finally(() => {
          setInflightRequest(undefined);
          setResponse$(undefined);
        });
    },
    [coPilot, notifications]
  );

  const [conversation, setConversation] = useState<
    { conversation: CoPilotConversation; messages: CoPilotConversationMessage[] } | undefined
  >();

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
    if (coPilot.isOpen && coPilot.conversationId) {
      loadConversation(coPilot.conversationId).then((next) => {
        setConversation(next);
      });
    } else {
      setConversation(undefined);
    }
  }, [coPilot.isOpen, coPilot.conversationId, loadConversation]);

  const continueChat = async ({
    next,
    currentConversation,
  }: {
    next: ChatCompletionRequestMessage;
    currentConversation:
      | {
          conversation: CoPilotConversation;
          messages: CoPilotConversationMessage[];
        }
      | null
      | undefined;
  }) => {
    if (!coPilot) {
      return;
    }

    let observable$: ChatResponseObservable = new Observable<CreateChatCompletionResponseChunk[]>();

    if (next.role === 'user') {
      setInflightRequest(next.content);
    }

    setResponse$(observable$);

    const newMessages: ChatCompletionRequestMessage[] = [];

    let conversationId = currentConversation?.conversation.conversation.id;

    try {
      let isNew = false;
      if (!conversationId) {
        const { conversation: nextConversation } = await coPilot.createConversation();
        conversationId = nextConversation.conversation.id;
        isNew = true;
        newMessages.push({
          content:
            "You are a helpful assistant for the Elastic APM product. Your users might be SREs or application developers who need help debugging a performance regression or a stability issue. Assume problems should be solved within the context of the Elastic APM app. You're talking to experienced professionals so don't baby them on basics. Some important field names are 'service.name', 'service.environment' (usually something like 'production', 'development', 'testing', 'qa') and 'service.version' (all keyword fields). Hosts are uniquely identified by `service.node.name`. For transactions and spans, 'event.outcome' describes whether the event was succesful or not. 'event.duration' describes how long the event took. For transaction data, we have 'transaction.type' (usually 'request' or 'page load'). For exit span data, there is 'span.destination.service.resource', which defines the name of the downstream target of the exit span. You are able to suggest and automatically execute functions autonomously. Your goal is to help the user determine the root cause of an issue quickly and transparently. Only suggest one function at a time. If you're unsure about the function that should be called, ask the user for clarification.",
          role: 'system',
        });
      }

      newMessages.push(next);

      observable$ = coPilot.chat(
        (currentConversation?.messages ?? [])
          .map((msg) => {
            const { order, ...rest } = msg.message;
            return rest;
          })
          .concat(newMessages)
      );

      setResponse$(observable$);

      const reply = await new Promise<ChatCompletionResponseMessage>((resolve, reject) => {
        let choice: ChatCompletionResponseMessage = {
          role: 'assistant',
          function_call: { arguments: '', name: '' },
          content: '',
        };

        observable$.subscribe({
          next: (chunks) => {
            choice = { ...choice, function_call: { arguments: '', name: '' }, content: '' };

            chunks.forEach((chunk) => {
              const delta = chunk.choices[0].delta;
              choice.content += delta.content ?? '';
              choice.function_call!.arguments += delta.function_call?.arguments ?? '';
              choice.function_call!.name += delta.function_call?.name ?? '';
            });
          },
          complete: () => {
            resolve(choice);
          },
          error: (err) => {
            reject(err);
          },
        });
      });

      await coPilot.append(conversationId, newMessages.concat(reply));

      if (isNew) {
        coPilot.autoTitleConversation(conversationId).catch((err) => {
          console.error(err);
        });
      }

      const nextConversation = await loadConversation(conversationId);
      setConversation(nextConversation);

      if (reply.function_call?.name) {
        await continueChat({
          next: await coPilot.callFunction(reply),
          currentConversation: nextConversation,
        });
      }
    } catch (error) {
      notifications.showErrorDialog({
        title: i18n.translate('xpack.observability.coPilotChat.failedToSubmit', {
          defaultMessage: 'Could not update conversation',
        }),
        error,
      });
      throw error;
    }
  };

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
                {coPilot.viewType === CoPilotChatViewType.Conversation
                  ? conversation?.conversation.conversation.title ||
                    i18n.translate('xpack.observability.coPilot.newChatPlaceholderTitle', {
                      defaultMessage: 'New chat',
                    })
                  : i18n.translate('xpack.observability.coPilotChat.conversationsListTitle', {
                      defaultMessage: 'Conversations',
                    })}
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
              continueChat({
                next: {
                  role: 'user',
                  content: input,
                },
                currentConversation: conversation,
              });
            }}
            loading={!conversation && !!coPilot.conversationId}
            conversation={conversation?.conversation}
            messages={conversation?.messages.filter((message) => message.message.role !== 'system')}
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
