/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactElement } from 'react';
import type { StyleDescriptor } from '../../../common/descriptor_types/style_property_descriptor_types';

export interface IStyle {
  getType(): string;
  renderEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void
  ): ReactElement<any> | null;
}
