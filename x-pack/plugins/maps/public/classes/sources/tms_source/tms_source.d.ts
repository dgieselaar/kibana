/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ISource } from '../source';
import { AbstractSource } from '../source';

export interface ITMSSource extends ISource {
  getUrlTemplate(): Promise<string>;
}

export class AbstractTMSSource extends AbstractSource implements ITMSSource {
  getUrlTemplate(): Promise<string>;
}
