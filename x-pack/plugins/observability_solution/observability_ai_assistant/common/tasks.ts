/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum InferenceTaskEventType {
  Update = 'update',
  Complete = 'complete',
}

type InferenceTaskEventBase<
  TEventType extends InferenceTaskEventType,
  TRest extends Record<string, any>
> = {
  id: string;
  type: TEventType;
} & TRest;

export type InferenceTaskUpdateEvent = InferenceTaskEventBase<
  InferenceTaskEventType.Update,
  {
    chunk: string;
  }
>;

export type InferenceTaskCompleteEvent<TOutput = unknown> = InferenceTaskEventBase<
  InferenceTaskEventType.Complete,
  {
    content: string;
    output: TOutput;
  }
>;

export type InferenceTaskEvent<TOutput = unknown> =
  | InferenceTaskUpdateEvent
  | InferenceTaskCompleteEvent<TOutput>;

export function createTaskCompleteEvent<TOutput extends Record<string, any> | undefined>({
  id,
  output,
  content,
}: {
  id: string;
  output?: TOutput;
  content?: string;
}): InferenceTaskCompleteEvent<TOutput> {
  return {
    type: InferenceTaskEventType.Complete,
    content: content || '',
    id,
    output: output as TOutput,
  };
}
