/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, Observable, OperatorFunction } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  CompatibleJSONSchema,
  InferenceTaskEvent,
  StreamingChatResponseEventType,
} from '../../common';
import {
  InferenceTaskCompleteEvent,
  InferenceTaskEventType,
  InferenceTaskUpdateEvent,
} from '../../common/tasks';
import { emitWithConcatenatedMessage } from '../../common/utils/emit_with_concatenated_message';

export function chatToTask({
  id,
  schema,
}: {
  id: string;
  schema?: CompatibleJSONSchema;
}): OperatorFunction<ChatCompletionChunkEvent, InferenceTaskEvent<any>> {
  return (source$: Observable<ChatCompletionChunkEvent>) => {
    return source$.pipe(
      emitWithConcatenatedMessage(),
      map((event) => {
        if (event.type === StreamingChatResponseEventType.ChatCompletionChunk) {
          const nextEvent: InferenceTaskUpdateEvent = {
            id,
            chunk: event.message.content ?? '',
            type: InferenceTaskEventType.Update,
          };
          return nextEvent;
        }

        let output: Record<string, any> | undefined;
        if (schema) {
          const parsedOutput = JSON.parse(event.message.message.function_call?.arguments ?? '{}');
          output = parsedOutput;
        }

        const nextEvent: InferenceTaskCompleteEvent = {
          type: InferenceTaskEventType.Complete,
          content: event.message.message.content ?? '',
          id,
          output: output || {},
        };

        return nextEvent;
      })
    );
  };
}
