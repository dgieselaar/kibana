/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { ChatCompletionResponseMessage } from 'openai';
import { CoPilotFunctionCall } from './co_pilot_function_call';

interface Props {
  loading: boolean;
  message: ChatCompletionResponseMessage & { data?: unknown };
  error?: any;
}

const cursorCss = css`
  @keyframes blink {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  animation: blink 1s infinite;
  width: 10px;
  height: 16px;
  vertical-align: middle;
  display: inline-block;
  background: rgba(0, 0, 0, 0.25);
`;

export function CoPilotChatBody({ loading, message, error }: Props) {
  let state: 'init' | 'loading' | 'streaming' | 'error' | 'complete' = 'init';

  const hasContent = !!(message.content || message.function_call?.name);

  if (loading) {
    state = hasContent ? 'streaming' : 'loading';
  } else if (error) {
    state = 'error';
  } else if (hasContent) {
    state = 'complete';
  }

  const children =
    'data' in message && message.data ? <CoPilotFunctionCall message={message} /> : message.content;

  if (state === 'complete' || state === 'streaming') {
    return (
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
        {children}
        {state === 'streaming' || !children ? <span className={cursorCss} /> : <></>}
      </p>
    );
  } else if (state === 'init' || state === 'loading') {
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {i18n.translate('xpack.observability.coPilotPrompt.chatLoading', {
              defaultMessage: 'Waiting for a response...',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon color="danger" type="warning" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{children}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return <></>;
}
