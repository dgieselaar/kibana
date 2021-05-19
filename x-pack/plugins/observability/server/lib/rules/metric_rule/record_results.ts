/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mapValues, chunk } from 'lodash';
import pLimit from 'p-limit';
import { RuleDataWriter } from '../../../../../rule_registry/server';
import {
  EVENT_KIND,
  TIMESTAMP,
} from '../../../../../rule_registry/common/technical_rule_data_field_names';
import type { QueryResults } from './create_execution_plan';

const BULK_LIMIT = 1000;
const WORKER_LIMIT = 1;

export async function recordResults({
  defaults,
  results,
  ruleDataWriter,
  bulkLimit = BULK_LIMIT,
  workerLimit = WORKER_LIMIT,
}: {
  results: QueryResults;
  defaults: Record<string, any>;
  ruleDataWriter: RuleDataWriter;
  bulkLimit?: number;
  workerLimit?: number;
}) {
  const dynamicTemplates = mapValues(results.record, (value) => {
    return value.type;
  });

  const docs = results.evaluations.map((evaluation) => {
    return {
      ...defaults,
      [TIMESTAMP]: evaluation.time,
      [EVENT_KIND]: 'metric',
      ...evaluation.labels,
      ...mapValues(results.record, (value, key) => {
        return evaluation.metrics[key] ?? null;
      }),
    };
  });

  const chunks = chunk(docs, BULK_LIMIT);
  const limiter = pLimit(workerLimit);

  return await Promise.all(
    chunks.map((batch) => {
      return limiter(async () => {
        const body = batch.flatMap((doc) => [
          { index: {}, dynamic_templates: dynamicTemplates },
          doc,
        ]);

        return ruleDataWriter.bulk({
          body,
        });
      });
    })
  );
}
