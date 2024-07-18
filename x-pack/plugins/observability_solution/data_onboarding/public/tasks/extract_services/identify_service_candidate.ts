/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  onlyTaskCompleteEvents,
  RunInferenceAPI,
  truncateList,
} from '@kbn/observability-ai-assistant-plugin/public';
import { groupBy, partition, shuffle, truncate } from 'lodash';
import { defer, switchMap, from, map } from 'rxjs';
import { DataOnboardingAPIClient } from '../../api';
import { EXTRACT_SERVICES_SYSTEM_MESSAGE } from './system_message';

export function identifyServiceCandidates({
  inference,
  signal,
  connectorId,
  apiClient,
  indexPatterns,
  start,
  end,
}: {
  inference: RunInferenceAPI;
  signal: AbortSignal;
  connectorId: string;
  apiClient: DataOnboardingAPIClient;
  indexPatterns: string[];
  start: number;
  end: number;
}) {
  return defer(() => {
    return from(
      apiClient('POST /internal/data_onboarding/tasks/analyze_sample_documents', {
        signal,
        params: {
          body: {
            indexPatterns,
            start,
            end,
            filter: '',
          },
        },
      })
    );
  }).pipe(
    switchMap((documentAnalysis) => {
      const [nonEmptyFields, emptyFields] = partition(
        documentAnalysis.fields,
        (field) => field.empty
      );

      const sortedFields = [...shuffle(emptyFields), ...shuffle(nonEmptyFields)];

      return inference.task('identify_service_candidates', {
        system: EXTRACT_SERVICES_SYSTEM_MESSAGE,
        input: `Your current task is to identify service candidates from the given datasets.
    
      You will be given a set of datasets, and some field/value pairs from a subset of
      the documents that are available in these datasets.

      Based on the field names, and field values, identify service candidates. A service
      candidate exists of a name and terms that could identify the service. 

      Things that might hint toward a service:

      - a service name
      - a k8s component or app name
      - a container image name

      DO NOT UNDER ANY CIRCUMSTANCES use values that are NOT available in the analyzed fields.

      When available, use service.name as the identifier.

      Select anywhere between 1 to 25 candidates.
      
      ## Field analysis

      Field analysis was based on ${documentAnalysis.sampled} sampled documents, out of
      ${documentAnalysis.total}.

      These are the analyzed fields:

      \`\`\`json
      ${JSON.stringify(
        sortedFields
          .map((field) => ({
            ...field,
            values: truncateList(field.values, 20).map((value) => {
              if (typeof value === 'string') {
                return truncate(value, { length: 64 });
              }
              return value;
            }),
          }))
          .slice(0, 750)
      )}
      \`\`\`

      ## Datasets

      The following datasets were queried:

      \`\`\`
      ${JSON.stringify(indexPatterns.join(','))}
      \`\`\`

      `,
        schema: {
          type: 'object',
          properties: {
            candidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description:
                      'The name of the service. In most cases this is the same as the field value',
                  },
                  terms: {
                    type: 'array',
                    items: {
                      type: 'string',
                      description: 'A KQL filter, in the form of `field.name:value`',
                    },
                  },
                },
                required: ['name', 'terms'],
              },
            },
          },
          required: ['candidates'],
        } as const,
        connectorId,
        signal,
      });
    }),
    onlyTaskCompleteEvents(),
    map((taskCompleteEvent) => {
      return {
        ...taskCompleteEvent,
        output: {
          ...taskCompleteEvent.output,
          candidates: Object.entries(
            groupBy(taskCompleteEvent.output.candidates, (candidate) => candidate.name)
          ).map(([name, candidates]) => {
            return {
              name,
              terms: candidates
                .flatMap((candidate) => candidate.terms)
                .map((term) => {
                  const [field, ...values] = term.split(':');
                  return { field, value: values.join(':') };
                })
                .slice(0, 5),
            };
          }),
        },
      };
    })
  );
}
