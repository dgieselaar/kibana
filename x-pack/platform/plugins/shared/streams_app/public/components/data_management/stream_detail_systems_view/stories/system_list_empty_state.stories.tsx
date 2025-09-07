/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { noop } from 'lodash';
import { SystemListEmptyState } from '../system_list_empty_state';

const stories: Meta<{}> = {
  title: 'Streams/StreamDetailSystemsView/SystemListEmptyState',
  component: SystemListEmptyState,
};

export default stories;

export const Empty: StoryFn<{}> = () => {
  return <SystemListEmptyState isIdentifying={false} onIdentifyClick={noop} />;
};

export const Loading: StoryFn<{}> = () => {
  return <SystemListEmptyState isIdentifying onIdentifyClick={noop} />;
};
