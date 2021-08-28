/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup } from '../../../core/public/types';
import type { Plugin } from '../../../core/public/plugins/plugin';
import { FORMATS_UI_SETTINGS } from '../common/constants/ui_settings';
import { FieldFormatsRegistry } from '../common/field_formats_registry';
import type { FormatFactory } from '../common/types';
import './index.scss';
import { baseFormattersPublic } from './lib/constants';

export class FieldFormatsPlugin implements Plugin<FieldFormatsSetup, FieldFormatsStart> {
  private readonly fieldFormatsRegistry: FieldFormatsRegistry = new FieldFormatsRegistry();

  public setup(core: CoreSetup): FieldFormatsSetup {
    core.uiSettings.getUpdate$().subscribe(({ key, newValue }) => {
      if (key === FORMATS_UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP) {
        this.fieldFormatsRegistry.parseDefaultTypeMap(newValue);
      }
    });

    const getConfig = core.uiSettings.get.bind(core.uiSettings);

    this.fieldFormatsRegistry.init(
      getConfig,
      {
        parsedUrl: {
          origin: window.location.origin,
          pathname: window.location.pathname,
          basePath: core.http.basePath.get(),
        },
      },
      baseFormattersPublic
    );

    return this.fieldFormatsRegistry as FieldFormatsSetup;
  }

  public start() {
    return this.fieldFormatsRegistry as FieldFormatsStart;
  }

  public stop() {}
}

/** @public */
export type FieldFormatsSetup = Pick<FieldFormatsRegistry, 'register' | 'has'>;

/** @public */
export type FieldFormatsStart = Omit<FieldFormatsRegistry, 'init' | 'register'> & {
  deserialize: FormatFactory;
};
