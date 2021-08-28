/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '../../../../../src/core/public/types';
import type { ChartsPluginSetup } from '../../../../../src/plugins/charts/public/types';
import type { ExpressionsSetup } from '../../../../../src/plugins/expressions/public/plugin';
import type { FormatFactory } from '../../common/types';
import type { EditorFrameSetup } from '../types';
import { getTimeZone } from '../utils';

export interface HeatmapVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class HeatmapVisualization {
  constructor() {}

  setup(
    core: CoreSetup,
    { expressions, formatFactory, editorFrame, charts }: HeatmapVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const timeZone = getTimeZone(core.uiSettings);

      const {
        getHeatmapVisualization,
        heatmap,
        heatmapLegendConfig,
        heatmapGridConfig,
        getHeatmapRenderer,
      } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();

      expressions.registerFunction(() => heatmap);
      expressions.registerFunction(() => heatmapLegendConfig);
      expressions.registerFunction(() => heatmapGridConfig);

      expressions.registerRenderer(
        getHeatmapRenderer({
          formatFactory,
          chartsThemeService: charts.theme,
          paletteService: palettes,
          timeZone,
        })
      );
      return getHeatmapVisualization({ paletteService: palettes });
    });
  }
}
