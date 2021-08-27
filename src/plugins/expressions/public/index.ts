/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import './index.scss';
import { ExpressionsPublicPlugin } from './plugin';

// Kibana Platform.
export {
  AnyExpressionFunctionDefinition,
  AnyExpressionTypeDefinition,
  ArgumentType,
  buildExpression,
  buildExpressionFunction,
  Datatable,
  DatatableColumn,
  DatatableColumnType,
  DatatableRow,
  Execution,
  ExecutionContainer,
  ExecutionContext,
  ExecutionContract,
  ExecutionParams,
  ExecutionState,
  Executor,
  ExecutorContainer,
  ExecutorState,
  ExpressionAstArgument,
  ExpressionAstExpression,
  ExpressionAstExpressionBuilder,
  ExpressionAstFunction,
  ExpressionAstFunctionBuilder,
  ExpressionAstNode,
  ExpressionFunction,
  ExpressionFunctionDefinition,
  ExpressionFunctionDefinitions,
  ExpressionFunctionParameter,
  ExpressionImage,
  ExpressionRenderDefinition,
  ExpressionRenderer,
  ExpressionRendererRegistry,
  ExpressionsInspectorAdapter,
  ExpressionsService,
  ExpressionsServiceSetup,
  ExpressionsServiceStart,
  ExpressionType,
  ExpressionTypeDefinition,
  ExpressionTypeStyle,
  ExpressionValue,
  ExpressionValueBoxed,
  ExpressionValueConverter,
  ExpressionValueError,
  ExpressionValueFilter,
  ExpressionValueNum,
  ExpressionValueRender,
  ExpressionValueRender as Render,
  ExpressionValueUnboxed,
  Font,
  FontLabel,
  FontStyle,
  FontValue,
  FontWeight,
  format,
  formatExpression,
  FunctionsRegistry,
  IInterpreterRenderHandlers,
  InterpreterErrorType,
  IRegistry,
  isExpressionAstBuilder,
  KnownTypeToString,
  Overflow,
  parse,
  parseExpression,
  PointSeries,
  PointSeriesColumn,
  PointSeriesColumnName,
  PointSeriesColumns,
  PointSeriesRow,
  Range,
  SerializedDatatable,
  SerializedFieldFormat,
  Style,
  TablesAdapter,
  TextAlignment,
  TextDecoration,
  TypesRegistry,
  TypeString,
  TypeToString,
  UnmappedTypeStrings,
} from '../common';
export * from './plugin';
export {
  ExpressionRendererComponent,
  ReactExpressionRenderer,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from './react_expression_renderer';
export { ExpressionRendererEvent, ExpressionRenderHandler } from './render';
// Static exports.
export { ExpressionExecutor, ExpressionRenderError, IExpressionLoaderParams } from './types';
export { ExpressionsPublicPlugin as Plugin };
export function plugin(initializerContext: PluginInitializerContext) {
  return new ExpressionsPublicPlugin(initializerContext);
}
