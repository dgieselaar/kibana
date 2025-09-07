/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Streams, System } from '@kbn/streams-schema';
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  withoutChunkEvents,
  withoutTokenCountEvents,
  type BoundInferenceClient,
} from '@kbn/inference-common';
import type { Observable } from 'rxjs';
import { defer, map, switchMap } from 'rxjs';
import { conditionToQueryDsl } from '@kbn/streamlang';
import { GenerateStreamDescriptionPrompt } from './prompt';

export function generateStreamDescription({
  stream,
  system,
  start,
  end,
  esClient,
  inferenceClient,
}: {
  stream: Streams.all.Definition;
  system?: System;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
}): Observable<string> {
  return defer(() => {
    return describeDataset({
      start,
      end,
      esClient,
      index: stream.name,
      filter: system ? conditionToQueryDsl(system.filter) : undefined,
    });
  }).pipe(
    switchMap((analysis) => {
      return inferenceClient.prompt({
        input: {
          name: system?.name || stream.name,
          dataset_analysis: JSON.stringify(
            sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true })
          ),
        },
        prompt: GenerateStreamDescriptionPrompt,
        stream: true,
      });
    }),
    withoutChunkEvents(),
    withoutTokenCountEvents(),
    map((event) => {
      return event.content;
    })
  );
}
