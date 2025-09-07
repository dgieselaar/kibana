/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { StreamDetailSystemsView } from '..';

const stories: Meta<{}> = {
  title: 'Streams/StreamDetailSystemsView',
  component: StreamDetailSystemsView,
};

export default stories;

const emptyDefinition: Streams.WiredStream.GetResponse = {
  dashboards: [],
  effective_lifecycle: {
    dsl: {},
    from: 'logs',
  },
  queries: [],
  rules: [],
  inherited_fields: {},
  privileges: {
    lifecycle: true,
    manage: true,
    monitor: true,
    simulate: true,
    text_structure: true,
  },
  stream: {
    name: 'logs',
    description: '',
    systems: [],
    ingest: {
      lifecycle: {
        inherit: {},
      },
      processing: {
        steps: [],
      },
      wired: {
        fields: {},
        routing: [],
      },
    },
  },
};

export const Empty: StoryFn<{}> = () => {
  return <StreamDetailSystemsView definition={emptyDefinition} />;
};
