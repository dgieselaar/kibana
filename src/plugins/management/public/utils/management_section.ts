/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Assign } from '@kbn/utility-types';
import type { CreateManagementItemArgs } from '../types';
import { ManagementSectionId } from '../types';
import type { RegisterManagementAppArgs } from './management_app';
import { ManagementApp } from './management_app';
import { ManagementItem } from './management_item';

export type RegisterManagementSectionArgs = Assign<
  CreateManagementItemArgs,
  { id: ManagementSectionId | string }
>;

export class ManagementSection extends ManagementItem {
  public readonly apps: ManagementApp[] = [];

  constructor(args: RegisterManagementSectionArgs) {
    super(args);
  }

  registerApp(args: Omit<RegisterManagementAppArgs, 'basePath'>) {
    if (this.getApp(args.id)) {
      throw new Error(`Management app already registered - id: ${args.id}, title: ${args.title}`);
    }

    const app = new ManagementApp({
      ...args,
      basePath: `/${this.id}/${args.id}`,
    });

    this.apps.push(app);

    return app;
  }

  getApp(id: ManagementApp['id']) {
    return this.apps.find((app) => app.id === id);
  }

  getAppsEnabled() {
    return this.apps.filter((app) => app.enabled);
  }
}
