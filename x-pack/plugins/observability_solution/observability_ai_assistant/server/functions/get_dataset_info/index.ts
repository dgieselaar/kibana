/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { chunk, compact, uniq } from 'lodash';
import { FunctionRegistrationParameters } from '..';
import { truncateList } from '../../../common';

import { FunctionVisibility } from '../../../common/functions/types';
import { analyzeFields } from './analyze_fields';
import { getRelevantFieldNames } from './get_relevant_field_names';
import { getSampleDocuments } from './get_sample_documents';
import { getTotalDocCount } from './get_total_doc_count';

export const GET_DATASET_INFO_FUNCTION_NAME = 'get_dataset_info';

export function registerGetDatasetInfoFunction({
  resources,
  functions,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: GET_DATASET_INFO_FUNCTION_NAME,
      visibility: FunctionVisibility.AssistantOnly,
      description: `Use this function to get information about indices/datasets available and the fields available on them.

      Keep the following things in mind:
      - An empty string for \`index\` is equivalent to a wildcard (\`*\`) and will list all indices. In this case, no fields
        will be returned.
      - If an index is specified, interesting fields for that index will be returned.
      - To look at sample values for interesting fields, use \`analyzeContent\`. This will analyze the cardinality of keyword
      fields and return its top terms, and for text fields like \`message\`, it will return sample text categories
      - If you're looking for a specific term, but don't know the field name, use the \`kqlFilter\` property to filter
      for data specific to that term. E.g. to look for the term \`my-specific-host\`, use the following function parameters:
      
      \`\`\`json
      { "kqlFilter": "\"my-specific-host\"" }
      \`\`\`
      `,
      descriptionForUser:
        'This function allows the assistant to get information about available indices and their fields.',
      parameters: {
        type: 'object',
        properties: {
          index: {
            type: 'string',
            description:
              'index pattern the user is interested in or empty string to get information about all available indices',
          },
          kqlFilter: {
            type: 'string',
            description: 'Filter the list of matching indices with a KQL query',
          },
          analyzeContent: {
            type: 'object',
            description: 'Analyze the content of documents over a given time range. This',
            properties: {
              start: {
                type: 'string',
                description:
                  'The start of the time range, in ISO timestamp or datemath, like now-15m',
              },
              end: {
                type: 'string',
                description:
                  'The end of the time range, in ISO timestamp or datemath, like now-15m',
              },
            },
            required: ['start', 'end'],
          },
        },
        required: ['analyzeContent'],
      } as const,
    },
    async ({ arguments: { index, analyzeContent, kqlFilter }, messages, chat }, signal) => {
      const coreContext = await resources.context.core;

      const savedObjectsClient = coreContext.savedObjects.client;

      const esClient = coreContext.elasticsearch.client;

      const indexPatterns = !index ? ['*'] : index.split(',');

      let indices: string[] = [];

      try {
        const body = await esClient.asCurrentUser.indices.resolveIndex({
          name: indexPatterns,
          expand_wildcards: 'open',
        });

        indices = [
          ...body.indices.map((i) => i.name),
          ...body.data_streams.map((d) => d.name),
          ...body.aliases.map((d) => d.name),
        ];
      } catch (e) {
        indices = [];
      }

      if (!index && !kqlFilter) {
        return {
          content: {
            indices: truncateList(indices, 50),
            fields: [],
          },
        };
      }

      if (indices.length === 0) {
        return {
          content: {
            indices,
            fields: [],
            ...(index
              ? {
                  instructions:
                    'No data was found. Consider retrying without an index, but with a kqlFilter if the user is looking for a specific term',
                }
              : {}),
          },
        };
      }

      const filter = kqlFilter
        ? [toElasticsearchQuery(fromKueryExpression(kqlFilter.replace(/^:\*/, '')))]
        : [];

      if (kqlFilter) {
        const explanationsResponse: {
          explanations: Array<{
            index: string;
            explanation: string;
          }>;
        } = await esClient.asCurrentUser.transport.request({
          method: 'POST',
          path: `${indexPatterns.join(',')}/_validate/query`,
          querystring: 'all_shards=true',
          body: {
            query: {
              bool: {
                filter,
              },
            },
          },
        });

        const indicesWithPossibilityOfMatchingDocs = explanationsResponse.explanations
          .filter(({ explanation }) => !explanation.includes('match_none'))
          .map(({ index: indexOfExplanation }) => indexOfExplanation);

        indices = uniq(indicesWithPossibilityOfMatchingDocs);
      }

      const indexSettings = Object.assign(
        {},
        ...(await Promise.all(
          chunk(indices.slice(0, 250), 50).map((indicesInChunk) =>
            esClient.asCurrentUser.indices.get({
              index: indicesInChunk,
              filter_path: '*.data_stream',
            })
          )
        ))
      );

      indices = uniq(
        Object.keys(indexSettings).map((key) => {
          return indexSettings[key].data_stream || key;
        })
      );

      const nonEmptyFields: string[] = [];

      if (kqlFilter && indices.length) {
        const hasAnyHitsResults = await esClient.asCurrentUser.msearch({
          searches: indices.slice(0, 50).flatMap((currentIndex) => [
            {
              index: currentIndex,
            },
            {
              query: { bool: { filter } },
              size: 1,
              track_total_hits: 1,
              terminate_after: 1,
            },
          ]),
        });

        indices = compact(
          indices.map((currentIndex, idx) => {
            const res = hasAnyHitsResults.responses[idx];
            if (!res || 'error' in res) {
              return currentIndex;
            }
            const docCount =
              typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0;

            if (docCount === 0) {
              return undefined;
            }
            return currentIndex;
          })
        );
      }

      if (kqlFilter || analyzeContent) {
        const { samples } = await getSampleDocuments({
          esClient,
          indices,
          filter,
          start: analyzeContent?.start,
          end: analyzeContent?.end,
        });

        for (const sample of samples) {
          const allFields = Object.keys(sample);
          allFields.forEach((field) => {
            if (!nonEmptyFields.includes(field)) {
              nonEmptyFields.push(field);
            }
          });
        }
      }

      const [{ total: totalDocCount }, relevantFieldNames] = await Promise.all([
        !!analyzeContent
          ? getTotalDocCount({
              start: analyzeContent.start,
              end: analyzeContent.end,
              esClient,
              indices,
              filter,
            })
          : Promise.resolve({ total: 0 }),
        getRelevantFieldNames({
          index: indices,
          messages,
          esClient,
          dataViews: await resources.plugins.dataViews.start(),
          savedObjectsClient,
          signal,
          chat,
          analyzeContent: !!analyzeContent,
          filter,
          nonEmptyFields,
        }),
      ]);

      const { fields } = relevantFieldNames;

      const keywordFieldsToAnalyze = fields
        .filter((field) => field.types.includes('keyword'))
        .map((field) => field.name);

      const textFieldsToAnalyze = fields
        .filter((field) => field.types.includes('text'))
        .map((field) => field.name);

      const analyzedFields =
        analyzeContent && (keywordFieldsToAnalyze.length || textFieldsToAnalyze.length)
          ? await analyzeFields({
              esClient: (await resources.context.core).elasticsearch.client,
              indices: indexPatterns,
              logger: resources.logger,
              totalDocCount,
              keywordFields: keywordFieldsToAnalyze,
              textFields: textFieldsToAnalyze,
              start: analyzeContent.start,
              end: analyzeContent.end,
              filter,
            })
          : { keyword: {}, text: {} };

      const { keyword, text } = analyzedFields;

      return {
        content: {
          indices,
          ...(totalDocCount > 0 ? { sampledDocumentCount: totalDocCount } : { foundDocuments: 0 }),
          fields: relevantFieldNames.fields
            .flatMap((field) => {
              return field.types.map((type) => {
                const keywordAnalysis = type === 'keyword' ? keyword[field.name] : undefined;
                const textAnalysis = type === 'text' ? text[field.name] : undefined;

                const header = `${field.name}:${type}`;

                if (keywordAnalysis && keywordAnalysis.top_terms.length) {
                  const { cardinality, top_terms: topTerms } = keywordAnalysis;
                  const delta = cardinality - topTerms.length;

                  return `${header} (${topTerms.map((term) => `\`${term}\``).join(', ')}${
                    delta > 0 ? ` and ${delta} more` : ''
                  })`;
                }

                if (textAnalysis && textAnalysis.categories.length) {
                  return `${header} (examples: ${textAnalysis.categories
                    .map((category) => `\`${category.samples[0]}\``)
                    .join(', ')})`;
                }

                if (field.empty) {
                  return `${header} (empty)`;
                }

                return header;
              });
            })
            .sort(),
          stats: relevantFieldNames.stats,
        },
      };
    }
  );
}
