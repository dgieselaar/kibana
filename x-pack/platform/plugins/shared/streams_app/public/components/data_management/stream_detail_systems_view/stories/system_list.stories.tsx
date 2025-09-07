/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { noop } from 'lodash';
import type { System } from '@kbn/streams-schema';
import { SystemList } from '../system_list';
import { elasticsearchDescription } from './storybook_data';

const stories: Meta<{}> = {
  title: 'Streams/StreamDetailSystemsView/SystemList',
  component: SystemList,
};

export default stories;

export const Empty: StoryFn<{}> = () => {
  return (
    <SystemList
      systems={[]}
      isIdentifying={false}
      onIdentifyClick={noop}
      onRemoveClick={() => Promise.resolve()}
      onUpdateClick={() => Promise.resolve()}
      onGenerateSigEventsClick={noop}
    />
  );
};

const elasticsearch: System = {
  name: 'elasticsearch',
  description: elasticsearchDescription,
  filter: {
    field: 'service.name',
    eq: 'elasticsearch',
  },
};

export const Three: StoryFn<{}> = () => {
  return (
    <SystemList
      systems={[elasticsearch]}
      isIdentifying={false}
      onIdentifyClick={noop}
      onRemoveClick={() => Promise.resolve()}
      onUpdateClick={() => Promise.resolve()}
      onGenerateSigEventsClick={noop}
    />
  );
};
