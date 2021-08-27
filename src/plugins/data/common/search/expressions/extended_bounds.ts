/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { isNil, omitBy } from 'lodash';
import type { ExpressionFunctionDefinition } from '../../../../expressions/common/expression_functions/types';
import type { ExpressionValueBoxed } from '../../../../expressions/common/expression_types/types';

export interface ExtendedBounds {
  min?: number;
  max?: number;
}

export type ExtendedBoundsOutput = ExpressionValueBoxed<'extended_bounds', ExtendedBounds>;

export type ExpressionFunctionExtendedBounds = ExpressionFunctionDefinition<
  'extendedBounds',
  null,
  ExtendedBounds,
  ExtendedBoundsOutput
>;

export const extendedBoundsFunction: ExpressionFunctionExtendedBounds = {
  name: 'extendedBounds',
  type: 'extended_bounds',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.extendedBounds.help', {
    defaultMessage: 'Create extended bounds',
  }),
  args: {
    min: {
      types: ['number'],
      help: i18n.translate('data.search.functions.extendedBounds.min.help', {
        defaultMessage: 'Specify the lower boundary value',
      }),
    },
    max: {
      types: ['number'],
      help: i18n.translate('data.search.functions.extendedBounds.max.help', {
        defaultMessage: 'Specify the upper boundary value',
      }),
    },
  },

  fn(input, { min, max }) {
    return {
      type: 'extended_bounds',
      ...omitBy({ min, max }, isNil),
    };
  },
};
