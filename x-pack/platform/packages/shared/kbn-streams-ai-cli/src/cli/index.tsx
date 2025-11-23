/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { runRecipe } from '@kbn/inference-cli';
import { prepareInk } from '@kbn/ink';
import type { AppContext, AppState } from './types';
import { DEFAULT_TIME_RANGE, computeTimeRangeBounds } from './utils/time_ranges';
import { ConnectorsService } from './services/connectors_service';
import { HttpProcessingService } from './services/processing_service';
import { StreamsService } from './services/streams_service';
import { keepAlive } from './utils/keep_alive';

export async function run() {
  return runRecipe(
    { name: 'streams_ai_cli_ink', flags: {}, disableRootSpan: true },
    async ({ inferenceClient, kibanaClient, esClient, logger, signal }) => {
      const connectorsService = new ConnectorsService(kibanaClient, signal);
      const streamsService = new StreamsService(kibanaClient, signal);

      const [connectors, streams] = await Promise.all([
        connectorsService.listConnectors(),
        streamsService.listStreams(),
      ]);

      const ink = await prepareInk();

      const { Root } = await import('./root');

      const { render } = ink;

      const context: AppContext = {
        inferenceClient,
        kibanaClient,
        esClient,
        logger,
        signal,
        services: {
          connectors: connectorsService,
          processing: new HttpProcessingService(kibanaClient, signal),
          streams: streamsService,
        },
      };

      const state: AppState = {
        connector: connectors.find(
          (connector) => connector.connectorId === inferenceClient.getConnectorId()
        )!,
        streams: {
          data: { streams },
          state: 'resolved',
          refresh: async () => {
            return {
              streams: await context.services.streams.listStreams(),
            };
          },
        },
        connectors: {
          data: { connectors },
          state: 'resolved',
          refresh: async () => {
            return {
              connectors: await context.services.connectors.listConnectors(),
            };
          },
        },
        timeRange: {
          option: DEFAULT_TIME_RANGE,
          ...computeTimeRangeBounds(DEFAULT_TIME_RANGE),
        },
      };

      const { unmount, waitUntilExit } = render(<Root context={context} state={state} />, {
        debug: false,
      });

      const unkeepAlive = keepAlive();

      // Wait for exit or abort signal
      await Promise.race([
        waitUntilExit(),
        new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => {
            unkeepAlive();
            unmount();
            resolve();
          });
        }),
      ]);
    }
  );
}
