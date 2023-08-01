/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlyout } from '@elastic/eui';
import React from 'react';
import type { ConversationCreateRequest } from '../../../common/types';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { ChatBody } from './chat_body';

export function ChatFlyout({
  initialConversation,
  isOpen,
  onClose,
}: {
  initialConversation: ConversationCreateRequest;
  isOpen: boolean;
  onClose: () => void;
}) {
  const connectors = useGenAIConnectors();

  const currentUser = useCurrentUser();

  const service = useObservabilityAIAssistant();

  return isOpen ? (
    <EuiFlyout onClose={onClose}>
      <ChatBody
        connectors={connectors}
        initialConversation={initialConversation}
        currentUser={currentUser}
        service={service}
      />
    </EuiFlyout>
  ) : null;
}
