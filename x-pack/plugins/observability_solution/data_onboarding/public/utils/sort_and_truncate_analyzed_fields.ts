/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, shuffle } from 'lodash';
import { truncateList } from '@kbn/observability-ai-assistant-plugin/public';
import type { DocumentAnalysis } from '../../server/routes/tasks/route';

export function sortAndTruncateAnalyzedFields(analysis: DocumentAnalysis) {
  const { fields, ...meta } = analysis;
  const [nonEmptyFields, emptyFields] = partition(analysis.fields, (field) => !field.empty);

  const sortedFields = [...shuffle(nonEmptyFields), ...shuffle(emptyFields)];

  return {
    ...meta,
    fields: truncateList(
      sortedFields.map((field) => {
        let name = `${field.name}:${field.types.join(',')}`;

        if (field.empty) {
          return `${name} (empty)`;
        }

        name += ` - ${field.cardinality} distinct values`;

        if (field.values.length && !field.types.includes('date')) {
          return `${name} (${truncateList(
            field.values.map((value) => '`' + value + '`'),
            field.types.includes('text') ? 5 : 25
          ).join(', ')})`;
        }

        return name;
      }),
      500
    ).sort(),
  };
}
