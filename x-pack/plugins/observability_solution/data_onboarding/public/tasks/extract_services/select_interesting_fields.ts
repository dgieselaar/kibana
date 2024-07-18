/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTaskCompleteEvent,
  onlyTaskCompleteEvents,
  RunInferenceAPI,
  ShortIdTable,
  truncateList,
  type InferenceTaskEvent,
} from '@kbn/observability-ai-assistant-plugin/public';
import { chunk, partition, shuffle, sortBy } from 'lodash';
import { defer, from, last, map, mergeMap, Observable, switchMap, toArray } from 'rxjs';
import { DataOnboardingAPIClient } from '../../api';
import { EXTRACT_SERVICES_SYSTEM_MESSAGE } from './system_message';

const MAX_FIELDS_PER_CHUNK = 250;
const MAX_PARALLEL_REQUESTS = 5;

interface AnalyzedField {
  name: string;
  types: string[];
  values: Array<string | number | boolean>;
  cardinality: number | null;
}

export function selectInterestingFields({
  inference,
  apiClient,
  indexPatterns,
  filter,
  start,
  end,
  signal,
  connectorId,
}: {
  inference: RunInferenceAPI;
  apiClient: DataOnboardingAPIClient;
  indexPatterns: string[];
  filter: string;
  start: number;
  end: number;
  signal: AbortSignal;
  connectorId: string;
}): Observable<
  InferenceTaskEvent<{
    interestingFields: AnalyzedField[];
    droppedFields: AnalyzedField[];
    totalDocuments: number;
  }>
> {
  return defer(() => {
    return from(
      apiClient('POST /internal/data_onboarding/tasks/analyze_sample_documents', {
        signal,
        params: {
          body: {
            indexPatterns,
            start,
            end,
            filter,
          },
        },
      })
    );
  }).pipe(
    switchMap(({ fields, total }) => {
      const table = new ShortIdTable();

      const keywordFields = fields.filter((field) => field.types.includes('keyword'));

      const chunks = chunk(
        sortBy(
          shuffle(keywordFields).slice(0, MAX_FIELDS_PER_CHUNK * MAX_PARALLEL_REQUESTS),
          (field) => field.name
        ),
        MAX_FIELDS_PER_CHUNK
      );

      return from(chunks).pipe(
        mergeMap((fieldsInChunk) => {
          return inference.task('select_interesting_fields', {
            system: EXTRACT_SERVICES_SYSTEM_MESSAGE,
            input: `
            Your first task is to select interesting fields from all the fields available for this data set.
            Select fields that you think identify a service, like \`service.name\`, or \`kubernetes.labels.component\`,
            or could help you identify a service. The selected fields will be analyzed in the next step to retrieve
            the top terms or log message patterns for those fields, which you can then use to extract a service definition.

            These are the fields. Return the IDs of the fields only.

            \`\`\`json
            ${JSON.stringify(
              fieldsInChunk.map((field) => ({
                id: table.take(field.name),
                name: field.name,
                cardinality: field.cardinality,
                values: truncateList(field.values, 3),
              }))
            )}
            \`\`\`
          `,
            signal,
            connectorId,
            schema: {
              type: 'object',
              properties: {
                ids: {
                  type: 'array',
                  items: {
                    type: 'string',
                    description: 'The IDs of the fields',
                  },
                },
              },
              required: ['ids'],
            } as const,
          });
        }, 3),
        onlyTaskCompleteEvents(),
        toArray(),
        last(),
        map((taskEvents) => {
          const allFieldNames = new Set([
            ...taskEvents.flatMap((event) =>
              event.output.ids.map((id) => {
                return table.lookup(id) ?? id;
              })
            ),
          ]);

          const [selectedFields, droppedFields] = partition(fields, (field) =>
            allFieldNames.has(field.name)
          );

          return createTaskCompleteEvent({
            id: 'select_relevant_fields',
            output: {
              totalDocuments: total,
              interestingFields: selectedFields,
              droppedFields,
            },
          });
        })
      );
    })
  );
}
