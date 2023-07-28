/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useState } from 'react';
import { ConversationCreateRequest } from '../../../common/types';
import { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { getTimelineItemsfromConversation } from '../../utils/get_timeline_items_from_conversation';
import { ChatHeader } from './chat_header';
import { ChatPromptEditor } from './chat_prompt_editor';
import { ChatTimeline } from './chat_timeline';

export interface ChatFlyoutProps {
  conversation: ConversationCreateRequest;
  connectors: UseGenAIConnectorsResult;
}

export function ChatFlyout({ conversation, connectors }: ChatFlyoutProps) {
  const {
    conversation: { title },
  } = conversation;

  const [isOpen, setIsOpen] = useState(true);

  const items = getTimelineItemsfromConversation({ conversation });

  return isOpen ? (
    <EuiFlyout onClose={() => setIsOpen(false)} size="m">
      <EuiFlyoutHeader hasBorder>
        <ChatHeader title={title} connectors={connectors} />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <ChatTimeline
          items={items}
          onEdit={() => {}}
          onRegenerate={() => {}}
          onFeedback={() => {}}
          onStopGenerating={() => {}}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter
        css={{ borderTop: `solid 1px ${euiThemeVars.euiBorderColor}`, background: '#fff' }}
      >
        <ChatPromptEditor loading={false} onSubmit={async () => {}} />
      </EuiFlyoutFooter>
    </EuiFlyout>
  ) : null;
}
