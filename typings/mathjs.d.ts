/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

declare module 'mathjs/lib/esm/number' {
  import { MathNode as BaseMathNode } from 'mathjs';

  export {
    FunctionNode,
    ConstantNode,
    MathNode as BaseMathNode,
    create,
    parseDependencies,
    MathJsStatic,
    andDependencies,
    orDependencies,
    notDependencies,
  } from 'mathjs';

  export interface MathNode extends BaseMathNode {
    args?: MathNode[];
    implicit?: boolean;
    index?: {
      dotNotation: boolean;
      dimensions: MathNode[];
    };
    object?: {
      name: string;
    };
  }
}
