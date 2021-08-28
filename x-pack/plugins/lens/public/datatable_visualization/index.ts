/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '../../../../../src/core/public/types';
import type { ChartsPluginSetup } from '../../../../../src/plugins/charts/public/types';
import type { DataPublicPluginStart } from '../../../../../src/plugins/data/public/types';
import type { ExpressionsSetup } from '../../../../../src/plugins/expressions/public/plugin';
import type { FormatFactory } from '../../common/types';
import type { EditorFrameSetup } from '../types';

interface DatatableVisualizationPluginStartPlugins {
  data: DataPublicPluginStart;
}
export interface DatatableVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class DatatableVisualization {
  constructor() {}

  setup(
    core: CoreSetup<DatatableVisualizationPluginStartPlugins, void>,
    { expressions, formatFactory, editorFrame, charts }: DatatableVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const {
        getDatatable,
        datatableColumn,
        getDatatableRenderer,
        getDatatableVisualization,
      } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();

      expressions.registerFunction(() => datatableColumn);
      expressions.registerFunction(() => getDatatable(() => formatFactory));
      expressions.registerRenderer(() =>
        getDatatableRenderer({
          formatFactory,
          getType: core
            .getStartServices()
            .then(([_, { data: dataStart }]) => dataStart.search.aggs.types.get),
          paletteService: palettes,
          uiSettings: core.uiSettings,
        })
      );
      return getDatatableVisualization({ paletteService: palettes });
    });
  }
}
