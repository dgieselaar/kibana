/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SYMBOLIZE_AS_TYPES } from '../../../../../common/constants';
import type { SymbolizeAsOptions } from '../../../../../common/descriptor_types/style_property_descriptor_types';
import { AbstractStyleProperty } from './style_property';

export class SymbolizeAsProperty extends AbstractStyleProperty<SymbolizeAsOptions> {
  isSymbolizedAsIcon = () => {
    return this.getOptions().value === SYMBOLIZE_AS_TYPES.ICON;
  };
}
