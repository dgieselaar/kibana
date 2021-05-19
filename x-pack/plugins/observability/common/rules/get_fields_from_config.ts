/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingConfig } from './alerting_dsl/alerting_dsl_rt';

export function getFieldsFromConfig(
  config?: AlertingConfig,
  { includeLabels = true }: { includeLabels?: boolean } = {}
) {
  if (!config) {
    return [];
  }

  const queries = 'query' in config ? [config.query] : config.queries;

  const fields: string[] = [];

  queries.forEach((query) => {
    const { by, metrics } = 'alerts' in query ? query.alerts : query;
    fields.push(...Object.keys(metrics));
    if (includeLabels) {
      fields.push(...Object.keys(by ?? {}));
    }
  });

  return [...new Set(fields)];
}
