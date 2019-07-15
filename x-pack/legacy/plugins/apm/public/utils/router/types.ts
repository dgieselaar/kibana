/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';

type TaskRecord = Record<string, Observable<any>>;

type Params = Record<string, string>;

interface RouteConfig {
  path: string;
  params?: Params;
  tasks?: TaskRecord;
  children?: Record<string, RouteConfig>;
}

interface RouteProps<T extends Params | undefined> {
  location: Location;
  params: T;
  nodes: RouteConfig[];
}

type RouteObservable<T extends Params | undefined> = Observable<RouteProps<T>>;

type TaskFactoryFn<
  T extends TaskRecord,
  U extends Params | undefined,
  V extends TaskRecord | undefined
> = (
  {
    route$,
    paused$,
    block
  }: {
    route$: RouteObservable<U>;
    paused$: Observable<boolean>;
    block: Block;
  },
  tasks: V
) => T;

export type Block = (fn: () => Observable<any>) => Observable<any>;

type ExtractObservableValueType<T> = T extends Observable<infer X> ? X : never;

type TaskReturnType<T extends TaskRecord | undefined> = {
  [key in keyof T]: ExtractObservableValueType<T[key]>;
};

type ChildFactoryFn<
  T extends Partial<RouteConfig>,
  U extends Record<string, T>
> = (child: RouterFactory<T>) => U;

interface LocalPlugin<
  T extends Params | undefined,
  U extends TaskRecord | undefined
> {
  onActivate?(params: T, taskData: TaskReturnType<U>): Promise<void>;
  onDeactivate?(): Promise<void>;
}

interface Router<T extends RouteConfig> {
  to<U extends RouteConfig>(config: U, params: U['params']): Promise<any>;
  buildPath<U extends RouteConfig>(
    config: U,
    params: U['params']
  ): Promise<any>;
  matchPath(path: string): RouteConfig | undefined;
  config: T;
}

interface RouteConfiguratorTypeChild {
  type: 'child';
}

interface RouteConfigurator<T extends Partial<RouteConfig>, U = undefined> {
  path(path: string): RouteConfigurator<T & { path: string }, U>;
  params<V extends Params>(params: V): RouteConfigurator<T & { params: V }, U>;
  tasks<V extends TaskRecord>(
    fn: TaskFactoryFn<V, T['params'], T['tasks']>
  ): RouteConfigurator<T & { tasks: V }, U>;
  children<V extends Record<string, T>>(
    fn: ChildFactoryFn<T, V>
  ): RouteConfigurator<T & { children: V }, RouteConfiguratorTypeChild>;
  plugins<V extends LocalPlugin<T['params'], T['tasks']>>(
    plugins: V[]
  ): RouteConfigurator<T & { plugins: V }, U>;
  end: () => T extends RouteConfig
    ? (U extends RouteConfiguratorTypeChild ? Router<T> : T)
    : never;
}

export type RouterFactory<
  T extends Partial<RouteConfig>
> = () => RouteConfigurator<T>;
