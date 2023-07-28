/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { ChatFlyout as Component, ChatFlyoutProps } from './chat_flyout';

export default {
  component: Component,
  title: 'app/Organisms/ChatFlyout',
};

const Template: ComponentStory<typeof Component> = (props: ChatFlyoutProps) => {
  return <Component {...props} />;
};

const defaultProps = {
  conversation: {
    '@timestamp': new Date().toISOString(),
    conversation: {
      title: 'My conversation',
    },
    labels: {},
    numeric_labels: {},
    messages: [],
  },
  connectors: {
    connectors: [
      {
        id: 'foo',
        referencedByCount: 1,
        actionTypeId: 'foo',
        name: 'GPT-v8-ultra',
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
      },
    ],
    loading: false,
    error: undefined,
    selectedConnector: 'foo',
    selectConnector: () => {},
  },
};

export const ChatFlyout = Template.bind({});
ChatFlyout.args = defaultProps;
