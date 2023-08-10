/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentList } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import React from 'react';
import { type Message } from '../../../common';

import type { Feedback } from '../feedback_buttons';
import { ChatItem } from './chat_item';

export interface ChatTimelineItem
  extends Pick<Message['message'], 'role' | 'content' | 'function_call'> {
  id: string;
  title: string;
  loading: boolean;
  canCopy: boolean;
  canEdit: boolean;
  canGiveFeedback: boolean;
  canRegenerate: boolean;
  collapsed: boolean;
  element?: React.ReactNode;
  hide: boolean;
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  error?: any;
}

export interface ChatTimelineProps {
  items: ChatTimelineItem[];
  onEdit: (item: ChatTimelineItem, message: Message) => Promise<void>;
  onFeedback: (item: ChatTimelineItem, feedback: Feedback) => void;
  onRegenerate: (item: ChatTimelineItem) => void;
  onStopGenerating: () => void;
}

export function ChatTimeline({
  items = [],
  onEdit,
  onFeedback,
  onRegenerate,
  onStopGenerating,
}: ChatTimelineProps) {
  return (
    <EuiCommentList>
      {items.map((item, index) =>
        !item.hide ? (
          <ChatItem
            // use index, not id to prevent unmounting of component when message is persisted
            key={index}
            {...item}
            onFeedbackClick={(feedback) => {
              onFeedback(item, feedback);
            }}
            onRegenerateClick={() => {
              onRegenerate(item);
            }}
            onEditSubmit={(message) => {
              return onEdit(item, message);
            }}
            onStopGeneratingClick={onStopGenerating}
          />
        ) : null
      )}
    </EuiCommentList>
  );
}
