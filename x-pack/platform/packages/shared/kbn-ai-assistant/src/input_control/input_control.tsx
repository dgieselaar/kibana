/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  EuiListGroup,
  EuiListGroupItem,
  EuiListGroupItemProps,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SerializedStyles } from '@emotion/serialize';
import { css } from '@emotion/css';
import { TextInput } from './text_input';

export enum InputControlMode {
  Prompt = 'prompt',
  Suggest = 'suggest',
  Note = 'note',
}

const BUTTON_OPTIONS: Record<
  InputControlMode,
  { label: string; placeholder: string; props: EuiButtonProps }
> = {
  [InputControlMode.Prompt]: {
    props: { iconType: 'sparkles' },
    label: i18n.translate('xpack.aiAssistant.inputControl.modeButtonLabelPrompt', {
      defaultMessage: 'Prompt',
    }),
    placeholder: i18n.translate('xpack.aiAssistant.inputControl.textInputPlaceholderPrompt', {
      defaultMessage: 'Send a message to the Assistant',
    }),
  },
  [InputControlMode.Note]: {
    label: i18n.translate('xpack.aiAssistant.inputControl.modeButtonLabelNote', {
      defaultMessage: 'Note',
    }),
    placeholder: i18n.translate('xpack.aiAssistant.inputControl.textInputPlaceholderNote', {
      defaultMessage: 'Add a note to the conversation',
    }),
    props: { iconType: 'documentEdit' },
  },
  [InputControlMode.Suggest]: {
    label: i18n.translate('xpack.aiAssistant.inputControl.modeButtonLabelSuggest', {
      defaultMessage: 'Visualizations',
    }),
    placeholder: i18n.translate(
      'xpack.aiAssistant.inputControl.textInputPlaceholderVisualization',
      {
        defaultMessage: 'Search for existing visualizations',
      }
    ),
    props: { iconType: 'visLine' },
  },
};

export interface InputControlSuggestion extends EuiListGroupItemProps {
  id: string;
}

export interface InputControlProps {
  mode: InputControlMode;
  onModeChange: (mode: InputControlMode) => void;
  value: string;
  onChange: (value: string) => void;
  suggestions: InputControlSuggestion[];
  onSuggestionClick: (suggestionId: string) => Promise<void>;
  onSubmit: () => Promise<void>;
  showSnapshotButton: boolean;
  onSnapshotClick: () => Promise<void>;
  className?: string;
  css?: SerializedStyles;
}

export function InputControl({
  mode,
  onModeChange,
  value,
  onChange,
  onSubmit,
  onSuggestionClick,
  suggestions,
  showSnapshotButton,
  onSnapshotClick,
  ...passthroughProps
}: InputControlProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [isSnapshotting, setIsSnapshotting] = useState(false);

  const popoverContent = suggestions.length ? (
    <EuiListGroup size="xs">
      {suggestions.map(({ id, ...groupItemProps }) => {
        return (
          <EuiListGroupItem
            size="xs"
            {...groupItemProps}
            key={id}
            onClick={() => {
              onSuggestionClick(id);
            }}
          />
        );
      })}
    </EuiListGroup>
  ) : null;

  const textInput = (
    <TextInput
      onChange={onChange}
      value={value}
      onLayoutChange={({ height }) => {}}
      resize={mode === InputControlMode.Suggest ? 'none' : 'vertical'}
      placeholder={BUTTON_OPTIONS[mode].placeholder}
      className={css`
        max-inline-size: none;
      `}
      onFocus={() => {
        setIsPopoverOpen(true);
      }}
      onBlur={() => {
        setIsPopoverOpen(false);
      }}
      onSubmit={() => {
        onSubmit();
      }}
    />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" {...passthroughProps}>
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
        {Object.entries(BUTTON_OPTIONS).map(([id, { label, props }]) => {
          return (
            <EuiButtonEmpty
              key={id}
              size="s"
              {...props}
              iconSize="s"
              color={id === mode ? 'primary' : 'text'}
              onClick={() => {
                onModeChange(id as InputControlMode);
              }}
            >
              <EuiText size="xs">{label}</EuiText>
            </EuiButtonEmpty>
          );
        })}
        <EuiFlexItem grow />
        {showSnapshotButton ? (
          <EuiButton
            size="s"
            iconSize="s"
            color="text"
            iconType="pageSelect"
            isLoading={isSnapshotting}
            onClick={() => {
              setIsSnapshotting(true);
              // give React the opportunity to upload the DOM and show a loader
              // before blocking the main thread
              Promise.resolve()
                .then(() => onSnapshotClick())
                .finally(() => {
                  setIsSnapshotting(false);
                });
            }}
          >
            <EuiText size="xs">
              {i18n.translate('xpack.aiAssistant.inputControl.snapshotButtonLabel', {
                defaultMessage: 'Take snapshot',
              })}
            </EuiText>
          </EuiButton>
        ) : null}
      </EuiFlexGroup>
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiInputPopover
          display="flex"
          closeOnScroll
          isOpen={suggestions.length > 0 && isPopoverOpen}
          closePopover={() => {
            setIsPopoverOpen(false);
          }}
          fullWidth
          disableFocusTrap
          className={css`
            flex: 1 0 auto;
            .euiFormControlLayout {
              max-inline-size: none;
            }
          `}
          input={textInput}
        >
          {popoverContent}
        </EuiInputPopover>
        <EuiButton
          size="m"
          iconType="playFilled"
          fill
          color="primary"
          className={css`
            min-inline-size: 48px;
          `}
          onClick={() => {
            onSubmit();
          }}
        />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
