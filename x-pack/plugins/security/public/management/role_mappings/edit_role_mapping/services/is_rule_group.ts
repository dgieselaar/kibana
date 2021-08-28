/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FieldRule } from '../../model/field_rule';
import type { Rule } from '../../model/rule';

export function isRuleGroup(rule: Rule) {
  return !(rule instanceof FieldRule);
}
