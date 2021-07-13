/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { arrayUnionToCallable } from '../../utils/array_union_to_callable';
import { AlertingConfig } from './alerting_dsl_rt';

export function normalizeQueries(config: AlertingConfig) {
  if ('query' in config) {
    return [config.query];
  }
  return config.queries.map((query) => {
    if ('alerts' in query) {
      return {
        ...query.alerts,
        alerts: {},
      };
    }

    return query;
  });
}

export function shouldWaitOnRecord(config: AlertingConfig) {
  const queries = normalizeQueries(config);
  return arrayUnionToCallable(queries).some((query) => 'alerts' in query);
}
