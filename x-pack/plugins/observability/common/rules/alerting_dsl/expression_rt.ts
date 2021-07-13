/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { parse } from '../../expressions/parser';

export const expressionRt = new t.Type(
  'expression',
  t.string.is,
  (input, context) => {
    return either.chain(t.string.validate(input, context), (inputAsString) => {
      try {
        parse(inputAsString);
        return t.success(inputAsString);
      } catch (err) {
        return t.failure(inputAsString, context, err.toString());
      }
    });
  },
  t.string.encode
);

// _tag is used by the io-ts to json schema converter
// @ts-ignore
expressionRt._tag = 'StringType';
