/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { expressionMath } from './expression_math';

export const expressionRt = new t.Type(
  'expression',
  t.string.is,
  (input, context) => {
    return either.chain(t.string.validate(input, context), (inputAsString) => {
      try {
        expressionMath.compile(inputAsString);
        return t.success(inputAsString);
      } catch (err) {
        return t.failure(inputAsString, context, err.toString());
      }
    });
  },
  t.string.encode
);

// @ts-ignore
expressionRt._tag = 'StringType';
