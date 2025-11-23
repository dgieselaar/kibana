/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Box } from 'ink';
import React from 'react';
import { Header } from './components/Header';
import { MainMenu } from './screens/main_menu';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AppProps {}

export function App({}: AppProps) {
  return (
    <Box flexDirection="column">
      <Header />
      <Box>
        <MainMenu />
      </Box>
    </Box>
  );
}
