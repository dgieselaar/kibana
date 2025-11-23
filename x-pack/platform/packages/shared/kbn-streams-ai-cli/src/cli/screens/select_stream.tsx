/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { RouteMenuDisplayItemProps } from '@kbn/ink/router';
import { RouteMenu } from '@kbn/ink/router';
import { useAppState } from '../state/use_app_state';
import { StreamDetail } from './stream_detail';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SelectStreamProps {}

export function SelectStream({}: SelectStreamProps) {
  const {
    state: { streams: streamsFetch },
  } = useAppState();

  const items = useMemo(() => {
    if (streamsFetch.state === 'resolved') {
      return streamsFetch.data.streams.map((stream): RouteMenuDisplayItemProps => {
        return {
          label: stream.name,
          path: stream.name,
          element: <StreamDetail stream={stream} />,
        };
      });
    }
    return [];
  }, [streamsFetch]);

  if (streamsFetch.state === 'pending') {
    return (
      <Box>
        <Text color="yellow">Refreshing streams...</Text>
      </Box>
    );
  }

  if (streamsFetch.state === 'rejected') {
    return (
      <Box>
        <Text color="red">Failed to fetch streams: {streamsFetch.error.message}</Text>
      </Box>
    );
  }

  return <RouteMenu label="Select stream" items={items} />;
}
