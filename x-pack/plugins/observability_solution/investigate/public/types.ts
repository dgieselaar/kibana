/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-empty-interface*/
import type { FromSchema } from 'json-schema-to-ts';
import type { CompatibleJSONSchema } from '@kbn/observability-ai-assistant-plugin/public';
import type { InvestigateWidget } from '../common';
import type { GlobalWidgetParameters, InvestigateWidgetCreate } from '../common/types';

interface WidgetRenderOptions<TInvestigateWidget extends InvestigateWidget> {
  widget: TInvestigateWidget;
  onDelete: () => void;
  onWidgetAdd: (create: InvestigateWidgetCreate) => Promise<void>;
}

export interface WidgetDefinition {
  type: string;
  description: string;
  schema: CompatibleJSONSchema;
  generate: (options: {
    parameters: GlobalWidgetParameters;
    signal: AbortSignal;
  }) => Promise<Record<string, any>>;
  render: (options: WidgetRenderOptions<InvestigateWidget>) => React.ReactNode;
  chrome?: 'disabled';
}

type RegisterWidgetOptions = Omit<WidgetDefinition, 'generate' | 'render'>;

type MaybeSchemaFrom<TSchema extends CompatibleJSONSchema | undefined> =
  {} & (TSchema extends CompatibleJSONSchema ? FromSchema<TSchema> : {});

type GenerateCallback<
  TSchema extends CompatibleJSONSchema | undefined,
  TData extends Record<string, any> | undefined
> = (options: {
  parameters: MaybeSchemaFrom<TSchema> & GlobalWidgetParameters;
  signal: AbortSignal;
}) => Promise<TData>;

export type RegisterWidget = <
  TSchema extends CompatibleJSONSchema,
  TData extends Record<string, any>
>(
  definition: Omit<RegisterWidgetOptions, 'schema'> & { schema: TSchema },
  generateCallback: GenerateCallback<TSchema, TData>,
  renderCallback: (
    options: WidgetRenderOptions<InvestigateWidget<MaybeSchemaFrom<TSchema>, TData>>
  ) => React.ReactNode
) => void;

export interface ConfigSchema {}

export interface InvestigateSetupDependencies {}

export interface InvestigateStartDependencies {}

export interface InvestigatePublicSetup {
  registerWidget: RegisterWidget;
}

export interface InvestigatePublicStart {
  getWidgetDefinitions: () => WidgetDefinition[];
}
