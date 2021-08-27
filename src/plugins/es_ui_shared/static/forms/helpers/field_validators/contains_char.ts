/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { containsChars } from '../../../validators/string/contains_chars';
import type { ValidationError, ValidationFunc } from '../../hook_form_lib/types';
import type { ERROR_CODE } from './types';

export const containsCharsField = ({
  message,
  chars,
}: {
  message: string | ((err: Partial<ValidationError>) => string);
  chars: string | string[];
}) => (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
  const [{ value }] = args;

  if (typeof value !== 'string') {
    return;
  }

  const { doesContain, charsFound } = containsChars(chars)(value as string);
  if (doesContain) {
    return {
      code: 'ERR_INVALID_CHARS',
      charsFound,
      message: typeof message === 'function' ? message({ charsFound }) : message,
    };
  }
};
