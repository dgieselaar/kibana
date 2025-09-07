/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { noop } from 'lodash';
import { SystemItem } from '../system_item';
import { elasticsearchDescription } from './storybook_data';

const stories: Meta<{}> = {
  title: 'Streams/StreamDetailSystemsView/SystemItem',
  component: SystemItem,
};

export default stories;

const elasticsearch = {
  name: 'elasticsearch',
  description: elasticsearchDescription,
  filter: {
    field: 'service.name',
    eq: 'elasticsearch',
  },
};

export const Viewing: StoryFn<{}> = () => {
  return (
    <SystemItem
      isGenerating={false}
      isUpdating={false}
      onRemoveClick={noop}
      onUpdateClick={noop}
      onGenerateClick={async () => {
        return 'description';
      }}
      onGenerateSigEventsClick={noop}
      system={elasticsearch}
      initialMode="viewing"
    />
  );
};

export const Editing: StoryFn<{}> = () => {
  return (
    <SystemItem
      isGenerating={false}
      isUpdating={false}
      onRemoveClick={noop}
      onUpdateClick={noop}
      onGenerateClick={async () => {
        return 'description';
      }}
      onGenerateSigEventsClick={noop}
      system={elasticsearch}
      initialMode="editing"
    />
  );
};
