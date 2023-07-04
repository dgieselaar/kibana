/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTextArea, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { concatMap, delay, map, Observable, of } from 'rxjs';
import { CoPilotConversation, CoPilotConversationMessage } from '../../../common/co_pilot';
import { ChatResponseObservable } from '../../../common/co_pilot/streaming_chat_response_observable';
import { CoPilotChatBody } from '../co_pilot_chat_body';
import { CoPilotChatBalloon } from './co_pilot_chat_balloon';

export function CoPilotChatConversation({
  messages,
  onSubmit,
  loading,
  response$,
  inflightRequest,
}: {
  conversation: CoPilotConversation | undefined;
  messages: CoPilotConversationMessage[] | undefined;
  onSubmit: (input: string) => Promise<void>;
  loading: boolean;
  response$: ChatResponseObservable | undefined;
  inflightRequest: string | undefined;
}) {
  const theme = useEuiTheme();

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const [input, setInput] = useState('');

  async function handleSubmit() {
    const prev = input;
    setInput(() => '');
    onSubmit(prev).catch(() => {
      setInput(prev);
    });
  }

  function adjustTextAreaHeight() {
    if (inputRef.current) {
      inputRef.current.style.height = '';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }

  useEffect(() => {
    adjustTextAreaHeight();
  }, [input]);

  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [responseError, setResponseError] = useState();

  const isLoading = !!(loading || inflightRequest || response$ || isResponseLoading);

  const mappedResponse$ = useMemo(() => {
    if (!response$) {
      setIsResponseLoading(false);
      setResponseError(undefined);
      return new Observable<never>((subscribe) => {
        subscribe.next();
      });
    }

    setIsResponseLoading(true);
    setResponseError(undefined);

    const piped$ = response$?.pipe(
      concatMap((value) => of(value).pipe(delay(50))),
      map((chunks) => {
        return chunks.reduce(
          (prev, current) => {
            const delta = current.choices[0].delta;
            prev.content += delta.content ?? '';
            prev.function_call.name += delta.function_call?.name ?? '';
            prev.function_call.arguments += delta.function_call?.arguments ?? '';
            return prev;
          },
          {
            content: '',
            function_call: { name: '', arguments: '' },
          }
        );
      })
    );

    piped$?.subscribe({
      complete: () => {
        setIsResponseLoading(false);
      },
      error: (err) => {
        setResponseError(err);
      },
    });

    return piped$;
  }, [response$]);

  const choice = useObservable(mappedResponse$);

  const displayedMessages = useMemo(() => {
    const allMessages =
      messages?.map((message) => ({
        loading: false,
        message: message.message,
      })) ?? [];

    if (inflightRequest) {
      allMessages.push({
        loading: false,
        message: {
          order: 1,
          role: 'user',
          content: inflightRequest,
        },
      });
    }

    if (choice) {
      allMessages.push({
        loading: isResponseLoading,
        message: {
          ...choice,
          order: 2,
          role: 'assistant',
        },
      });
    }

    return allMessages.filter(
      (message) =>
        !(
          (!message.loading && message.message.role === 'assistant' && !message.message.content) ||
          message.message.role === 'system'
        )
    );
  }, [messages, inflightRequest, choice, isResponseLoading]);

  return (
    <EuiFlexGroup
      direction="column"
      css={css`
        padding: ${theme.euiTheme.size.l};
        padding-bottom: 0;
      `}
    >
      <EuiFlexItem grow>
        {displayedMessages.length > 0 ? (
          <EuiFlexGroup direction="column">
            {displayedMessages.map((message) => (
              <EuiFlexItem grow={false}>
                <CoPilotChatBalloon role={message.message.role}>
                  <CoPilotChatBody message={message.message} loading={message.loading} />
                </CoPilotChatBalloon>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        className={css`
          position: relative;
          padding-bottom: ${theme.euiTheme.size.l};
          .euiFormControlLayout {
            max-width: none;
          }
          .euiTextArea {
            max-width: none;
            resize: none;
            height: 40px;
            max-height: 200px;
          }
        `}
      >
        <>
          <EuiTextArea
            data-test-subj="CoPilotChatConversationTextArea"
            value={input}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleSubmit();
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            inputRef={(next) => {
              inputRef.current = next;
              adjustTextAreaHeight();
            }}
            onSubmit={() => handleSubmit()}
            disabled={isLoading}
          />
          <EuiButtonIcon
            className={css`
              position: absolute;
              top: ${theme.euiTheme.size.xs};
              right: ${theme.euiTheme.size.xs};
            `}
            color="primary"
            size="m"
            iconType="playFilled"
            disabled={isLoading}
            isLoading={isLoading}
          />
        </>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
