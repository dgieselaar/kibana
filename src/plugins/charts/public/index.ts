/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ChartsPlugin } from './plugin';

export const plugin = () => new ChartsPlugin();

export {
  CustomPaletteArguments,
  CustomPaletteState,
  paletteIds,
  PaletteOutput,
  SystemPaletteArguments,
} from '../common';
export { ChartsPluginSetup, ChartsPluginStart } from './plugin';
export { useActiveCursor } from './services/active_cursor';
export { lightenColor } from './services/palettes/lighten_color';
export * from './services/palettes/types';
export * from './static';
