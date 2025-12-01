/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { RouteMenu } from '@kbn/ink/router';
import { useAppState } from '../state/use_app_state';
import { SelectConnector } from './select_connector';
import { SelectStream } from './select_stream';
import { SetTimeRange } from './set_time_range';
import { Investigate } from './investigate';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MainMenuProps {}

export function MainMenu({}: MainMenuProps) {
  const { exit } = useAppState();

  const items = useMemo(() => {
    return [
      {
        path: 'streams',
        label: 'Select stream',
        element: <SelectStream />,
      },
      {
        path: 'investigate',
        label: 'Investigate',
        element: <Investigate />,
      },
      {
        path: 'connector',
        label: 'Select connector',
        element: <SelectConnector />,
      },
      {
        path: 'timerange',
        label: 'Set time range',
        element: <SetTimeRange />,
      },
      {
        label: 'Exit',
        onSelect: () => {
          exit();
        },
      },
    ];
  }, [exit]);

  return <RouteMenu items={items} label="Main menu" />;
}
