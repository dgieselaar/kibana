/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import type { Attachment } from '@kbn/observability-ai-assistant-plugin/common';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';

export interface AttachmentListProps {
  attachments?: Attachment[];
  onAttachmentRemove?: (attachment: Attachment) => Promise<void>;
}

function getPanelContent(attachment: Attachment): {
  icon: string;
  title: string;
  content: React.ReactNode;
  href?: string;
} {
  if (attachment.type === 'note') {
    const payload = attachment.payload as {
      note: {
        message: string;
      };
    };
    return {
      icon: 'documentEdit',
      title: i18n.translate('xpack.aiAssistant.attachmentList.attachmentTitleNote', {
        defaultMessage: 'Note',
      }),
      content: <EuiText size="s">{payload.note.message}</EuiText>,
    };
  }

  if (attachment.type === 'snapshot') {
    const payload = attachment.payload.snapshot as {
      href: string;
      title: string;
      image?: {
        encoding: 'base64';
        dataURL: string;
      };
    };

    return {
      icon: 'link',
      title: payload.title,
      href: payload.href,
      content: payload.image ? (
        <EuiImage src={payload.image.dataURL} alt={payload.title} size="l" allowFullScreen />
      ) : null,
    };
  }
  throw new Error(`Unsupported attachment type ${attachment.type}`);
}

function AttachmentPanel({
  attachment,
  onAttachmentRemove,
}: {
  attachment: Attachment;
  onAttachmentRemove: () => void;
}) {
  const { title, icon, content, href } = getPanelContent(attachment);

  const theme = useEuiTheme();

  const titleElement = (
    <EuiText
      size="xs"
      className={css`
        font-weight: ${theme.euiTheme.font.weight.semiBold};
      `}
    >
      {title}
    </EuiText>
  );

  const [forceState, setForceState] = useState<'open' | 'closed'>('closed');

  return (
    <EuiAccordion
      id={attachment.id}
      paddingSize="s"
      className={css`
        border: 1px solid ${theme.euiTheme.colors.borderBaseSubdued};
        padding: 0 ${theme.euiTheme.size.s};
        border-radius: ${theme.euiTheme.border.radius.small};
      `}
      arrowProps={{
        size: 'xs',
      }}
      buttonElement="div"
      buttonContentClassName={css`
        width: 100%;
      `}
      forceState={forceState}
      onToggle={(next) => {
        setForceState(() => (next ? 'open' : 'closed'));
      }}
      buttonContent={
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon size="s" type={icon} />
          </EuiFlexItem>
          <EuiFlexItem grow>
            {href ? (
              // eslint-disable-next-line @elastic/eui/href-or-on-click
              <EuiLink
                href={href}
                onClick={() => {
                  // close the thing again, because we've clicked on a URL
                  const current = forceState;
                  setTimeout(() => setForceState(() => current), 0);
                }}
              >
                {titleElement}
              </EuiLink>
            ) : (
              titleElement
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="crossInCircle"
              color="text"
              iconSize="s"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onAttachmentRemove();
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {content}
    </EuiAccordion>
  );
}

export function AttachmentList({ attachments, onAttachmentRemove }: AttachmentListProps) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {attachments?.map((attachment) => {
        return (
          <AttachmentPanel
            key={attachment.id}
            attachment={attachment}
            onAttachmentRemove={() => {
              onAttachmentRemove?.(attachment);
            }}
          />
        );
      })}
    </EuiFlexGroup>
  );
}
