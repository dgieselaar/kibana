/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  map,
  distinctUntilChanged,
  combineLatest,
  switchMap
} from 'rxjs/operators';
import { interval, BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';
import { createRouter } from './';
import { getParsedDate } from '../../context/UrlParamsContext/helpers';
import { Block } from './types';

const http = (block: Block) => (path: string) =>
  block(() => {
    const subject = new BehaviorSubject<{
      state: 'LOADING' | 'SUCCESS' | 'ERROR';
      data: any;
    }>({ state: 'LOADING', data: null });
    fetch(path)
      .then(val => {
        subject.next({ state: 'SUCCESS', data: val });
      })
      .catch(err => {
        subject.next({ state: 'ERROR', data: null });
      });

    return subject;
  });

const router = createRouter()
  .path('/')
  .params({ start: 'string', end: 'string' })
  .tasks(({ route$, paused$ }) => {
    const interval$ = paused$.pipe(switchMap(() => interval(5000)));

    const timeRange$ = route$.pipe(
      map(_ => ({ start: _.params.start, end: _.params.end })),
      combineLatest(interval$),
      map(([range]) => {
        return {
          start: getParsedDate(range.start),
          end: getParsedDate(range.end, { roundUp: true })
        };
      }),
      distinctUntilChanged((a, b) => isEqual(a, b))
    );

    return {
      timeRange$
    };
  })
  .children(child => {
    const children = {
      home: child()
        .path('/')
        .plugins([])
        .end(),
      services: child()
        .path('/services')
        .params({ environment: 'string' })
        .tasks(({ route$, paused$, block }, { timeRange$ }) => {
          return {
            services$: timeRange$.pipe(
              switchMap(range =>
                http(block)(
                  `/api/services?start=${range.start}&end=${range.end}`
                )
              )
            )
          };
        })
        .end()
    };
    return children;
  })
  .plugins([
    {
      onActivate: (params, taskData) => {
        return Promise.resolve();
      }
    }
  ])
  .end();

const { config } = router;

router.to(config.children.services, { start: '', end: '', environment: '' });
router.buildPath(config.children.services, {
  start: '',
  end: '',
  environment: ''
});
router.matchPath('');
