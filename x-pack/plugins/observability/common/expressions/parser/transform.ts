/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionNode, ConstantNode, MathJsStatic } from 'mathjs/lib/esm/number';
import type { MathNode } from 'mathjs/lib/esm/number';

const getImplicitGroups = (node: MathNode): MathNode[] => {
  if (node.fn === 'multiply' && node.implicit) {
    return [...node.args!.flatMap(getImplicitGroups)];
  }
  return [node];
};

const SET_OPERATORS = ['and', 'unless', 'or'];

export function transform(
  node: MathNode,
  math: MathJsStatic & { FunctionNode: FunctionNode; ConstantNode: ConstantNode }
): MathNode {
  if (node.fn === 'multiply' && node.implicit) {
    const groups: MathNode[] = getImplicitGroups(node).map((n) => transform(n, math));

    const indexOfSetOperator = groups.findIndex((group) => SET_OPERATORS.includes(group.name!));

    if (indexOfSetOperator !== -1) {
      const operator = groups[indexOfSetOperator];
      groups.splice(indexOfSetOperator, 1);

      return new math.FunctionNode(operator, groups);
    }

    const wrapped = groups.reverse().reduce((prev, current) => {
      return prev
        ? new math.FunctionNode(current.name, (current.args ?? []).concat(prev))
        : current;
    }, undefined as any);

    return wrapped;
  }

  switch (node.name) {
    case 'by':
    case 'ignoring':
    case 'without':
    case 'on':
    case 'group_left':
    case 'group_right':
      return new math.FunctionNode(
        node.name,
        node.args?.map((child) => {
          if (node.isConstantNode) {
            return node;
          }

          let key: string;
          if (child.index?.dotNotation) {
            key = [
              child.object!.name,
              ...child.index?.dimensions.map((dimensionNode: MathNode) => dimensionNode.value),
            ].join('.');
          } else {
            key = child.object!.name;
          }
          return new math.ConstantNode(key);
        }) ?? []
      );
  }

  return node;
}
