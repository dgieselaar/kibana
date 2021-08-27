/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { format } from './format';
import type { ExpressionAstExpression } from './types';

/**
 * Given expression pipeline AST, returns formatted string.
 *
 * @param ast Expression pipeline AST.
 */
export function formatExpression(ast: ExpressionAstExpression): string {
  return format(ast, 'expression');
}
