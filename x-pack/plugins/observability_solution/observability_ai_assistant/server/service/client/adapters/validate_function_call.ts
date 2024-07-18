/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Ajv from 'ajv';
import { ignoreElements, last, merge, Observable, shareReplay, tap } from 'rxjs';
import { createFunctionNotFoundError, FunctionDefinition } from '../../../../common';
import { ChatEvent, createFunctionValidationError } from '../../../../common/conversation_complete';
import { concatenateChatCompletionChunks } from '../../../../common/utils/concatenate_chat_completion_chunks';
import { withoutTokenCountEvents } from '../../../../common/utils/without_token_count_events';

const ajv = new Ajv({
  strict: false,
});

export function validateFunctionCall({
  functions,
  functionCall,
  validate,
}: {
  functions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
  functionCall?: string;
  validate?: boolean;
}) {
  return (source$: Observable<ChatEvent>) => {
    const shared$ = source$.pipe(shareReplay());

    return merge(
      shared$,
      shared$.pipe(
        withoutTokenCountEvents(),
        concatenateChatCompletionChunks(),
        last(),
        tap((event) => {
          const nameOfCalledFunction = event.message.function_call.name;
          if (
            nameOfCalledFunction &&
            functions?.find((fn) => fn.name === nameOfCalledFunction) === undefined
          ) {
            throw createFunctionNotFoundError(nameOfCalledFunction);
          }

          if (!validate || !functions?.length) {
            return;
          }

          if (functionCall && !nameOfCalledFunction) {
            throw createFunctionValidationError(
              `Requested function ${functionCall} was not called`
            );
          }

          const functionDefinition = functions.find((fn) => fn.name === nameOfCalledFunction)!;

          const validator = ajv.compile(functionDefinition);

          const isValid = validator(JSON.parse(event.message.function_call.arguments));
          if (!isValid) {
            throw createFunctionValidationError(`Function validation failed`, validator.errors);
          }
        }),
        ignoreElements()
      )
    );
  };
}
