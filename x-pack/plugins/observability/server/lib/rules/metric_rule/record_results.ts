/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mapValues, chunk } from 'lodash';
import pLimit from 'p-limit';
import { isInstantVector } from '../../../../common/expressions/utils';
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
  refresh = false,
}: {
  results: QueryResults;
  defaults: Record<string, any>;
  ruleDataWriter: RuleDataWriter;
  bulkLimit?: number;
  workerLimit?: number;
  refresh: 'wait_for' | boolean;
}) {
  if (!Object.keys(results.record).length) {
    return undefined;
  }
  const dynamicTemplates = mapValues(results.record, (value) => {
    return value.record!.type;
  });

  defaults = {
    ...defaults,
    [EVENT_KIND]: 'metric',
  };

  const docs: Record<string, Record<string, number | string | null>> = {};

  // eslint-disable-next-line guard-for-in
  for (const key in results.evaluations) {
    const result = results.evaluations[key];
    if (isInstantVector(result)) {
      result.samples.forEach((sample) => {
        const id = sample.sig() + '-' + result.time.toString();
        if (!docs[id]) {
          docs[id] = {
            ...sample.labels.record,
          };
        }
        Object.assign(docs[id], {
          ...defaults,
          [TIMESTAMP]: result.time,
          [key]: sample.value,
        });
      });
    }
  }

  const chunks = chunk(Object.values(docs), BULK_LIMIT);
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
          refresh,
        });
      });
    })
  );
}
