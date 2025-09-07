/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { lastValueFrom } from 'rxjs';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { useKibana } from '../../../hooks/use_kibana';
import { useAIFeatures } from '../../../hooks/use_ai_features';

interface UseStreamDescriptionResult {
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  generateDescription: () => Promise<any>;
}

export function useStreamDescription(
  definition: Streams.all.Definition
): UseStreamDescriptionResult {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const aiFeatures = useAIFeatures();

  const connectorId = aiFeatures?.genAiConnectors.selectedConnector;

  const [description, setDescription] = useState(definition.description);

  const controllerRef = useRef<AbortController>();

  if (!controllerRef.current) {
    controllerRef.current = new AbortController();
  }

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const generateDescription = useCallback(
    function generateDescriptionCallback(): Promise<
      | {
          content: string;
          type: 'stream_description';
        }
      | undefined
    > {
      if (!connectorId) {
        return Promise.resolve(undefined);
      }

      controllerRef.current?.abort();

      controllerRef.current = new AbortController();

      const end = moment();
      const start = end.subtract(24, 'hour');

      return lastValueFrom(
        streams.streamsRepositoryClient.stream(
          'POST /internal/streams/{name}/onboarding/_generate_stream_description',
          {
            signal: controllerRef.current.signal,
            params: {
              path: {
                name: definition.name,
              },
              query: {
                start: start.toISOString(),
                end: end.toISOString(),
                connectorId,
                kql: '',
              },
            },
          }
        )
      );
    },
    [streams.streamsRepositoryClient, definition.name, connectorId]
  );

  return useMemo(
    () => ({
      description,
      setDescription,
      generateDescription,
    }),
    [description, setDescription, generateDescription]
  );
}
