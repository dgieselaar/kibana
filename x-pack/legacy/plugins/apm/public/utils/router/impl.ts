/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// import React from 'react';
// import { switchMap, map } from 'rxjs/operators';
// import { Location } from 'history';
// import { ReactNode, ComponentType } from 'react';
// import { once, uniqueId } from 'lodash';
// import { history } from '../../../../utils/history';

// const root$ = new BehaviorSubject({
//   location: history.location,
//   params: {},
//   nodes: []
// });

// history.listen(() => {
//   root$.next({
//     location: history.location,
//     params: {},
//     nodes: []
//   });
// });

// const createRouter: RouteFactory<{}> = {} as any;

// export { createRouter };

// export function route<T extends Params>(initialParams: T) {
//   const id = uniqueId();

//   type Route = typeof route;

//   function trail<
//     V extends { params: Params; tasks: TaskRecord; path: string; id: string }
//   >(config: V) {
//     const t = {
//       children(fn: (child: Route) => void) {
//         const p = config.params;
//         return trail({
//           ...config,
//           children: fn(() => route(p))
//         });
//       },
//       params<W extends Params>(params: W) {
//         return trail({
//           ...config,
//           params
//         });
//       },
//       tasks<W extends TaskRecord>(fn: TaskFactoryFn<W, V['params']>) {
//         return trail({
//           ...config,
//           data: mapTasks<W, V['params'] & T>(id, fn)
//         });
//       },
//       end: () => config
//     };
//     return t;
//   }

//   return {
//     path: (path: string) =>
//       trail({ path, id, params: initialParams, tasks: {} })
//   };
// }

// export function mapTasks<
//   T extends TaskRecord,
//   U extends Params,
//   V extends TaskRecord = {}
// >(
//   id: string,
//   taskFactoryFn: TaskFactoryFn<T, U>,
//   inheritedTasks: V = {} as V
// ): T {
//   const paused$ = new BehaviorSubject(true);
//   const active$ = new BehaviorSubject(false);

//   const route$ = paused$.pipe(
//     switchMap(paused => (paused ? never() : root$)),
//     map(_ => {
//       return {
//         ..._,
//         params: _.params as U
//       };
//     })
//   );

//   const pending: Array<Observable<any>> = [];

//   const options = {
//     route$,
//     paused$: paused$.pipe(),
//     wait: (waitFn: () => Observable<any>) => {
//       const task = waitFn();
//       pending.push(task);
//       const onComplete = () => {
//         const index = pending.indexOf(task);
//         if (index !== -1) {
//           pending.splice(index, 1);
//         }
//       };
//       task.toPromise().then(onComplete, onComplete);
//     }
//   };

//   router.onLocationChange((location, params, nodes) => {
//     const active = nodes.some(node => node.id === id);
//     paused$.next(!active);
//     if (active) {
//       Promise.resolve().then(() => {
//         Promise.all([]).then(() => {
//           active$.next(true);
//         });
//       });
//     } else {
//       active$.next(false);
//     }
//   });

//   const tasks = taskFactoryFn(options, inheritedTasks);

//   const mappedTasks = Object.keys(tasks).reduce((acc, key) => {
//     const task = tasks[key];
//     return {
//       ...acc,
//       [key]: active$.pipe(switchMap(active => (active ? task : never())))
//     };
//   }, {});

//   return mappedTasks as T;
// }

// export const renderAsync = (fn: () => Promise<ComponentType<{}>>) => {
//   const memoizedFn = once(fn);
//   return async () => {
//     const Component = await memoizedFn();
//     return () => <Component />;
//   };
// };
