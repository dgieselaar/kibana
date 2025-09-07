/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiMarkdownEditor,
  EuiMarkdownFormat,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import type { System } from '@kbn/streams-schema';
import { GenerateButton } from './generate_button';
import { ConnectorListButton } from '../../connector_list_button/connector_list_button';

const SYSTEM_NAME_FORM_LABEL_MSG = i18n.translate(
  'xpack.streams.streamsDetailSystemsView.systemItem.systemNameFormLabel',
  {
    defaultMessage: 'Name',
  }
);

const SYSTEM_DESCRIPTION_FORM_LABEL_MSG = i18n.translate(
  'xpack.streams.streamsDetailSystemsView.systemItem.systemDescriptionFormLabel',
  {
    defaultMessage: 'Description',
  }
);

const SAVE_CHANGES_BUTTON_LABEL_MSG = i18n.translate(
  'xpack.streams.streamsDetailSystemsView.systemItem.saveChangesButtonLabel',
  {
    defaultMessage: 'Save',
  }
);

const GENERATE_SIGNIFICANT_EVENTS_BUTTON_LABEL_MSG = i18n.translate(
  'xpack.streams.streamsDetailSystemsView.systemItem.generateSignificantEventsButtonLabel',
  {
    defaultMessage: 'Generate significant events',
  }
);

interface SystemItemProps {
  onRemoveClick: () => void;
  isUpdating: boolean;
  isGenerating: boolean;
  onUpdateClick: (next: System) => void | Promise<void>;
  onGenerateClick: () => Promise<string>;
  onGenerateSigEventsClick: () => void;
  system: System;
  initialMode?: 'viewing' | 'editing';
}

export function SystemItem(props: SystemItemProps) {
  const {
    initialMode = 'viewing',
    system,
    onRemoveClick,
    onUpdateClick,
    isUpdating,
    onGenerateSigEventsClick,
  } = props;

  const [isEditing, setIsEditing] = useState(initialMode === 'editing');

  const [name, setName] = useState(system.name);
  const [description, setDescription] = useState(system.description);

  useEffect(() => {
    setName(system.name);
    setDescription(system.description);
  }, [system.name, system.description]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiFlexItem grow>
          <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="namespace" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                <EuiTitle size="m">
                  <h3>{system.name}</h3>
                </EuiTitle>
                <EuiCode>{JSON.stringify(system.filter)}</EuiCode>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
            <ConnectorListButton
              buttonProps={{
                iconType: 'sparkles',
                onClick: () => {
                  onGenerateSigEventsClick();
                },
                children: GENERATE_SIGNIFICANT_EVENTS_BUTTON_LABEL_MSG,
              }}
            />
            <EuiButtonEmpty
              iconType="trash"
              size="s"
              onClick={() => {
                onRemoveClick();
              }}
            />
            {!isEditing ? (
              <EuiButtonEmpty
                iconType="pencil"
                size="s"
                onClick={() => {
                  setIsEditing(true);
                }}
              />
            ) : (
              <EuiButton
                fill
                type="submit"
                iconType="save"
                onClick={() => {
                  Promise.resolve(
                    onUpdateClick({
                      name,
                      description,
                      filter: system.filter,
                    })
                  ).then(() => {
                    setIsEditing(false);
                  });
                }}
                isLoading={isUpdating}
                size="s"
              >
                {SAVE_CHANGES_BUTTON_LABEL_MSG}
              </EuiButton>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isEditing ? (
        <SystemItemEditing
          {...props}
          onGenerateClick={() => {
            return props.onGenerateClick().then((desc) => {
              setDescription(desc);
              return desc;
            });
          }}
          onUpdate={(next) => {
            if (next.description) {
              setDescription(next.description);
            }
            if (next.name) {
              setName(next.name);
            }
          }}
        />
      ) : (
        <SystemItemViewing {...props} />
      )}
    </EuiFlexGroup>
  );
}

function SystemItemViewing({ system }: SystemItemProps) {
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      className={css`
        max-height: 400px;
        overflow: auto;
      `}
      paddingSize="l"
    >
      <EuiMarkdownFormat>{system.description}</EuiMarkdownFormat>
    </EuiPanel>
  );
}

function SystemItemEditing({
  isGenerating,
  onGenerateClick,
  system,
  onUpdate,
}: SystemItemProps & { onUpdate: (next: { description?: string; name?: string }) => void }) {
  return (
    <EuiForm fullWidth>
      <EuiFormRow label={SYSTEM_NAME_FORM_LABEL_MSG}>
        <EuiFieldText
          value={system.name}
          onChange={(event) => {
            onUpdate({ name: event.target.value });
          }}
        />
      </EuiFormRow>

      <EuiFormRow label={SYSTEM_DESCRIPTION_FORM_LABEL_MSG}>
        <EuiMarkdownEditor
          onChange={(content) => {
            onUpdate({ description: content });
          }}
          value={system.description}
          aria-labelledby="system-item"
          toolbarProps={{
            right: (
              <GenerateButton
                onClick={() => {
                  onGenerateClick();
                }}
                isLoading={isGenerating}
              />
            ),
          }}
        />
      </EuiFormRow>
    </EuiForm>
  );
}
