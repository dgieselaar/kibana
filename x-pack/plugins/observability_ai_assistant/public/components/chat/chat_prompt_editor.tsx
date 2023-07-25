/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFunctions, Func } from '../../hooks/use_functions';

export interface ChatPromptEditorProps {
  onSubmitPrompt: (prompt: string) => void;
}

export function ChatPromptEditor({ onSubmitPrompt }: ChatPromptEditorProps) {
  const functions = useFunctions();

  const [prompt, setPrompt] = useState('');
  const [isFunctionListOpen, setIsFunctionListOpen] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(event.currentTarget.value);
  };

  const handleSubmit = () => {
    onSubmitPrompt(prompt);
  };

  const handleClickFunctionList = () => {
    setIsFunctionListOpen(!isFunctionListOpen);
  };

  const handleSelectFunction = (func: Func) => {
    setIsFunctionListOpen(false);
  };

  return (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="downLeft"
          button={
            <EuiButtonIcon
              display="base"
              iconType="function"
              size="m"
              onClick={handleClickFunctionList}
            />
          }
          closePopover={handleClickFunctionList}
          panelPaddingSize="s"
          isOpen={isFunctionListOpen}
        >
          <EuiContextMenuPanel
            size="s"
            items={functions.map((func) => (
              <EuiContextMenuItem key={func.id} onClick={() => handleSelectFunction(func)}>
                {func.function_name}
              </EuiContextMenuItem>
            ))}
          />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiFieldText
          fullWidth
          value={prompt}
          placeholder={i18n.translate('xpack.observabilityAiAssistant.prompt.placeholder', {
            defaultMessage: 'Press ‘space’ or ‘$’ for function recommendations',
          })}
          onChange={handleChange}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          disabled={!prompt}
          display={prompt ? 'fill' : 'base'}
          iconType="kqlFunction"
          size="m"
          onClick={handleSubmit}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
