/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams, System } from '@kbn/streams-schema';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetchCallback } from '../../../hooks/use_streams_app_fetch_callback';
import { useAIFeatures } from '../../../hooks/use_ai_features';

interface UseIdentifySystemsResult {
  identifySystems: () => Promise<{ systems: System[] } | undefined>;
}

export function useIdentifySystems({
  definition,
}: {
  definition: Streams.all.Definition;
}): UseIdentifySystemsResult {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const aiFeatures = useAIFeatures();

  const connectorId = aiFeatures?.genAiConnectors.selectedConnector;

  const identifySystems = useStreamsAppFetchCallback(
    ({ signal }) => {
      if (!connectorId) {
        return Promise.resolve(undefined);
      }

      const end = moment();
      const start = end.clone().subtract(24, 'hour');

      const response$ = streams.streamsRepositoryClient.stream(
        'POST /internal/streams/{name}/onboarding/_identify_systems',
        {
          params: {
            path: {
              name: definition.name,
            },
            query: {
              connectorId,
              start: start.toISOString(),
              end: end.toISOString(),
              kql: '',
            },
          },
          signal,
        }
      );

      return lastValueFrom(response$);
    },
    [streams.streamsRepositoryClient, connectorId, definition.name]
  );

  return {
    identifySystems,
  };
}
