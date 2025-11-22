/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'ink';
import { runRecipe } from '@kbn/inference-cli';
import { App } from './App';
import { LogBuffer } from './utils/log_buffer';
import type { Logger } from '@kbn/core/server';

export async function run() {
  return runRecipe(
    { name: 'streams_ai_cli_ink', flags: {}, disableRootSpan: true },
    async ({ inferenceClient, kibanaClient, esClient, logger, signal }) => {
      const logBuffer = new LogBuffer(1000);

      // Create a wrapped logger that also logs to the buffer
      const wrappedLogger: Logger = {
        ...logger,
        info: (message: string, meta?: any) => {
          logBuffer.add('info', message);
          logger.info(message, meta);
        },
        warn: (message: string, meta?: any) => {
          logBuffer.add('warn', message);
          logger.warn(message, meta);
        },
        error: (message: string, meta?: any) => {
          logBuffer.add('error', typeof message === 'string' ? message : String(message));
          logger.error(message, meta);
        },
        debug: (message: string, meta?: any) => {
          logBuffer.add('debug', message);
          logger.debug(message, meta);
        },
        trace: logger.trace,
        fatal: logger.fatal,
        log: logger.log,
        get: logger.get,
        isLevelEnabled: logger.isLevelEnabled,
      };

      const context = {
        inferenceClient,
        kibanaClient,
        esClient,
        logger: wrappedLogger,
        signal,
      };

      // Render the Ink app
      const { unmount, waitUntilExit } = render(<App context={context} logBuffer={logBuffer} />);

      // Wait for exit or abort signal
      await Promise.race([
        waitUntilExit(),
        new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => {
            unmount();
            resolve();
          });
        }),
      ]);
    }
  );
}
