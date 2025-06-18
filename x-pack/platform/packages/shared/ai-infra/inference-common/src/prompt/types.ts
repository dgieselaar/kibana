/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Assign, Overwrite } from 'utility-types';
import { MessageRole, ToolChoice, ToolDefinition, ToolOptions } from '../chat_complete';
import { Model } from '../model_provider';
import { PromptOptions } from './api';

export interface ModelMatch extends Model {
  id?: string;
}

export interface StaticPromptTemplate {
  static: {
    content: string;
  };
}

export interface MustachePromptTemplate {
  mustache: {
    template: string;
  };
}

export interface ChatPromptTemplate {
  chat: {
    messages: Array<{
      content: string;
      role: MessageRole.User | MessageRole.Assistant;
    }>;
  };
}

export type PromptTemplate = MustachePromptTemplate | ChatPromptTemplate | StaticPromptTemplate;

export type PromptVersion<TToolOptions extends ToolOptions = ToolOptions> = {
  models?: ModelMatch[];
  system?: string | MustachePromptTemplate;
  template: MustachePromptTemplate | ChatPromptTemplate | StaticPromptTemplate;
  temperature?: number;
} & TToolOptions;

export interface Prompt<TInput = any, TPromptVersions extends PromptVersion[] = PromptVersion[]> {
  name: string;
  description: string;
  input: z.Schema<unknown, z.ZodTypeDef, TInput>;
  versions: TPromptVersions;
}

export interface PromptFactory<
  TInput = any,
  TPromptVersions extends PromptVersion[] = PromptVersion[]
> {
  version<TNextPromptVersion extends PromptVersion>(
    version: TNextPromptVersion
  ): PromptFactory<TInput, [...TPromptVersions, TNextPromptVersion]>;
  get: () => Prompt<TInput, TPromptVersions>;
}

export type ToolOptionsOfPrompt<TPrompt extends Prompt> = TPrompt['versions'] extends Array<
  infer TPromptVersion
>
  ? TPromptVersion extends PromptVersion
    ? Pick<TPromptVersion, 'tools' | 'toolChoice'>
    : never
  : never;

type MergeToolOptions<TLeft extends ToolOptions, TRight extends ToolOptions> = Overwrite<
  Pick<TLeft, 'tools' | 'toolChoice'>,
  {
    toolChoice: TRight['toolChoice'] extends ToolChoice
      ? TRight['toolChoice']
      : TLeft['toolChoice'];
    tools: TLeft['tools'] extends Record<string, ToolDefinition>
      ? TRight['tools'] extends Record<string, ToolDefinition>
        ? Assign<TLeft['tools'], TRight['tools']>
        : TLeft['tools']
      : TRight['tools'] extends Record<string, ToolDefinition>
      ? TRight['tools']
      : {};
  }
>;

export type ToolOptionsOfPromptOptions<TPromptOptions extends PromptOptions> = Omit<
  TPromptOptions,
  'tools' | 'toolChoice'
> &
  MergeToolOptions<ToolOptionsOfPrompt<TPromptOptions['prompt']>, TPromptOptions>;
