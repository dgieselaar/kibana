/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup, CoreStart } from '../../../core/public/types';
import type { Plugin } from '../../../core/public/plugins/plugin';
import { getDeleteFieldProvider } from './components/delete_field_provider';
import { initApi } from './lib/api';
import { getFieldDeleteModalOpener } from './open_delete_modal';
import { getFieldEditorOpener } from './open_editor';
import { FormatEditorService } from './service/format_editor_service';
import type { PluginSetup, PluginStart, SetupPlugins, StartPlugins } from './types';

export class IndexPatternFieldEditorPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  private readonly formatEditorService = new FormatEditorService();

  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    const { fieldFormatEditors } = this.formatEditorService.setup();

    return {
      fieldFormatEditors,
    };
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    const { fieldFormatEditors } = this.formatEditorService.start();
    const {
      application: { capabilities },
      http,
    } = core;
    const { data, usageCollection } = plugins;
    const openDeleteModal = getFieldDeleteModalOpener({
      core,
      indexPatternService: data.indexPatterns,
      usageCollection,
    });
    return {
      fieldFormatEditors,
      openEditor: getFieldEditorOpener({
        core,
        indexPatternService: data.indexPatterns,
        apiService: initApi(http),
        fieldFormats: data.fieldFormats,
        fieldFormatEditors,
        search: data.search,
        usageCollection,
      }),
      openDeleteModal,
      userPermissions: {
        editIndexPattern: () => {
          return capabilities.management.kibana.indexPatterns;
        },
      },
      DeleteRuntimeFieldProvider: getDeleteFieldProvider(openDeleteModal),
    };
  }

  public stop() {
    return {};
  }
}
