/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionRegistrationParameters } from '..';

const CREATE_SLO_FUNCTION_NAME = 'create_slo';

export function registerCreateSloFunction({
  functions,
  resources: {
    logger,
    context: { core: corePromise, alerting },
    plugins: { ruleRegistry },
  },
}: FunctionRegistrationParameters) {
  // functions.registerFunction(
  //   {
  //     name: CREATE_SLO_FUNCTION_NAME,
  //     description: 'Create availability, latency and error rate SLOs',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         slos: {
  //           type: 'array',
  //           items: {
  //             oneOf: [
  //               {
  //                 type: 'object',
  //                 properties: {
  //                   name: {
  //                     type: 'string',
  //                   },
  //                   sloType: {
  //                     type: 'string',
  //                     const: 'availability',
  //                   },
  //                   goodEventsKqlQuery: {
  //                     type: 'string',
  //                   },
  //                   totalEventsKqlQuery: {
  //                     type: 'string',
  //                   },
  //                 },
  //               },
  //               {
  //                 type: 'object',
  //                 properties: {
  //                   name: {
  //                     type: 'string',
  //                   },
  //                   sloType: {
  //                     type: 'string',
  //                     const: 'errorRate',
  //                   },
  //                   badEventsKqlQuery: {
  //                     type: 'string',
  //                   },
  //                   totalEventsKqlQuery: {
  //                     type: 'string',
  //                   },
  //                 },
  //               },
  //             ],
  //           },
  //         },
  //       },
  //     },
  //   },
  //   async () => {
  //     return {
  //       content: {},
  //     };
  //   }
  // );
}
