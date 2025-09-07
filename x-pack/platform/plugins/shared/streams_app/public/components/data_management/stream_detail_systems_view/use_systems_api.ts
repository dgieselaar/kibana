/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { System } from '@kbn/streams-schema';
import { useStreamsAppFetchCallback } from '../../../hooks/use_streams_app_fetch_callback';
import { useKibana } from '../../../hooks/use_kibana';

export function useSystemsApi({ name }: { name: string }) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const addSystems = useStreamsAppFetchCallback(
    ({ signal }, systems: System[]) => {
      return streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/onboarding/_add_systems',
        {
          signal,
          params: {
            path: {
              name,
            },
            body: {
              systems,
            },
          },
        }
      );
    },
    [streamsRepositoryClient, name]
  );

  const removeSystem = useStreamsAppFetchCallback(
    ({ signal }, system: System) => {
      return streamsRepositoryClient.fetch(
        'DELETE /internal/streams/{name}/onboarding/system/{systemName}',
        {
          signal,
          params: {
            path: {
              name,
              systemName: system.name,
            },
          },
        }
      );
    },
    [streamsRepositoryClient, name]
  );

  const updateSystem = useStreamsAppFetchCallback(
    ({ signal }, system: System) => {
      return streamsRepositoryClient.fetch(
        'PUT /internal/streams/{name}/onboarding/system/{systemName}',
        {
          signal,
          params: {
            path: {
              name,
              systemName: system.name,
            },
            body: {
              description: system.description,
              filter: system.filter,
            },
          },
        }
      );
    },
    [streamsRepositoryClient, name]
  );

  return {
    addSystems,
    removeSystem,
    updateSystem,
  };
}
