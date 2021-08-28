/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FIELD_ORIGIN } from '../../../common/constants';
import type { IVectorSource } from '../sources/vector_source/vector_source';
import type { IField } from './field';
import { AbstractField } from './field';

export class InlineField<T extends IVectorSource> extends AbstractField implements IField {
  private readonly _source: T;
  private readonly _dataType: string;

  constructor({
    fieldName,
    source,
    origin,
    dataType,
  }: {
    fieldName: string;
    source: T;
    origin: FIELD_ORIGIN;
    dataType: string;
  }) {
    super({ fieldName, origin });
    this._source = source;
    this._dataType = dataType;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async getLabel(): Promise<string> {
    return this.getName();
  }

  async getDataType(): Promise<string> {
    return this._dataType;
  }
}
