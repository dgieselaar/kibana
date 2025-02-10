/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { ComponentStory, ComponentStoryObj } from '@storybook/react';
import { css } from '@emotion/react';
import { KibanaReactStorybookDecorator } from '../utils/storybook_decorator.stories';
import {
  InputControl as Component,
  InputControlProps as ComponentProps,
  InputControlMode,
  InputControlSuggestion,
} from './input_control';

/*
  JSON Schema validation in the PromptEditor compponent does not work
  when rendering the component from within Storybook.

*/
export default {
  component: Component,
  title: 'app/InputControl',
  argTypes: {},
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: ComponentProps) => {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState(InputControlMode.Prompt);
  const suggestions: InputControlSuggestion[] = useMemo(() => {
    return mode === InputControlMode.Suggest
      ? [
          {
            label: 'Foo',
            id: 'foo',
            iconType: 'dashboardApp',
          },
          {
            label: 'Bar',
            id: 'bar',
            iconType: 'dashboardApp',
          },
        ]
      : [];
  }, [mode]);

  return (
    <Component
      css={css`
        width: 480px;
      `}
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
      }}
      mode={mode}
      onModeChange={(next) => {
        setValue('');
        setMode(next);
      }}
      showSnapshotButton
      onSnapshotClick={async () => {}}
      suggestions={suggestions}
    />
  );
};

export const InputControl: ComponentStoryObj<typeof Component> = {
  args: {},
  render: Template,
};
