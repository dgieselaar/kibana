/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AggregateOfMap } from '@kbn/es-types/src/search';
import { toNumberRt } from '@kbn/io-ts-utils';
import { createObservabilityEsClient } from '@kbn/observability-utils/es/client/create_observability_es_client';
import { kqlQuery } from '@kbn/observability-utils/es/queries/kql_query';
import { rangeQuery } from '@kbn/observability-utils/es/queries/range_query';
import { flattenObject } from '@kbn/observability-utils/object/flatten_object';
import * as t from 'io-ts';
import { castArray, partition, sortBy, uniq, uniqBy } from 'lodash';
import pLimit from 'p-limit';
import { createDataOnboardingServerRoute } from '../create_data_onboarding_server_route';

type MaybeNestedFilterAggregationMap = Record<
  string,
  {
    filter: QueryDslQueryContainer;
  } & {
    aggs: MaybeNestedFilterAggregationMap;
  }
>;

interface DistributionTree {
  filter: string;
  docCount: number;
  availability: 'all' | 'some' | 'none';
  children: DistributionTree[];
}

export interface DocumentAnalysis {
  total: number;
  sampled: number;
  fields: Array<{
    name: string;
    types: string[];
    cardinality: number | null;
    values: Array<string | number | boolean>;
    empty: boolean;
  }>;
}

const sampleDocumentsRoute = createDataOnboardingServerRoute({
  endpoint: 'POST /internal/data_onboarding/tasks/analyze_sample_documents',
  options: {
    tags: [],
  },
  params: t.type({
    body: t.intersection([
      t.union([
        t.type({
          indexPatterns: t.array(t.string),
          filter: t.string,
        }),
        t.type({
          sources: t.array(
            t.intersection([
              t.type({
                dataset: t.string,
              }),
              t.partial({
                filter: t.string,
              }),
            ])
          ),
        }),
      ]),
      t.type({
        start: toNumberRt,
        end: toNumberRt,
      }),
    ]),
  }),
  handler: async (resources): Promise<DocumentAnalysis> => {
    const core = await resources.context.core;

    const { start, end } = resources.params.body;

    const TOTAL_REQUESTS = 5;

    const requests =
      'sources' in resources.params.body
        ? resources.params.body.sources.map((source) => ({
            indexPatterns: [source.dataset],
            filter: source.filter,
          }))
        : (new Array(TOTAL_REQUESTS).fill({
            indexPatterns: resources.params.body.indexPatterns,
            filter: resources.params.body.filter,
          }) as Array<{ indexPatterns: string[]; filter?: string }>);

    const DOCS_PER_REQUEST = 500;

    const esClient = createObservabilityEsClient({
      client: core.elasticsearch.client.asCurrentUser,
      logger: resources.logger,
      plugin: 'data_onboarding',
    });

    const [allSampledDocumentsResponses, fieldCapsResponse] = await Promise.all([
      Promise.all(
        requests.map(({ indexPatterns, filter }) =>
          esClient.search('get_sample_documents', {
            index: indexPatterns,
            expand_wildcards: 'open',
            size: DOCS_PER_REQUEST,
            track_total_hits: true,
            timeout: '10s',
            query: {
              bool: {
                must: [...rangeQuery(start, end), ...kqlQuery(filter)],
                should: [
                  {
                    function_score: {
                      query: {
                        match_all: {},
                      },
                      functions: [
                        {
                          random_score: {},
                        },
                      ],
                    },
                  },
                ],
              },
            },
            sort: {
              _score: {
                order: 'desc',
              },
            },
          })
        )
      ),
      resources.plugins.dataViews
        .start()
        .then((dataViews) =>
          dataViews.dataViewsServiceFactory(
            core.savedObjects.client,
            core.elasticsearch.client.asCurrentUser
          )
        )
        .then((dataViewsService) => {
          return dataViewsService.getFieldsForWildcard({
            pattern: uniq(requests.flatMap((request) => request.indexPatterns)).join(','),
            indexFilter: {
              bool: {
                filter: rangeQuery(start, end),
              },
            },
            includeEmptyFields: false,
          });
        }),
    ]);

    const totalDocs = allSampledDocumentsResponses[0].hits.total.value;

    const allHits = allSampledDocumentsResponses.flatMap((response) => response.hits.hits);

    const uniqueHits = uniqBy(allHits, (hit) => hit._id);

    const flattenedObjects = uniqueHits.map((hit) => {
      return flattenObject(hit._source!);
    });

    const nonEmptyFields = new Set<string>();
    const fieldValues = new Map<string, Array<string | number | boolean>>();

    for (const flattenedObject of flattenedObjects) {
      Object.keys(flattenedObject).forEach((field) => {
        if (!nonEmptyFields.has(field)) {
          nonEmptyFields.add(field);
        }

        const values = castArray(flattenedObject[field]);

        const currentFieldValues = fieldValues.get(field) ?? [];

        values.forEach((value) => {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            currentFieldValues.push(flattenedObject[field]);
          }
        });

        fieldValues.set(field, currentFieldValues);
      });
    }

    const fields = fieldCapsResponse.flatMap((spec) => {
      const values = fieldValues.get(spec.name);

      const countByValues = new Map<string | number | boolean, number>();

      values?.forEach((value) => {
        const currentCount = countByValues.get(value) ?? 0;
        countByValues.set(value, currentCount + 1);
      });

      const sortedValues = sortBy(
        Array.from(countByValues.entries()).map(([value, count]) => {
          return {
            value,
            count,
          };
        }),
        'count',
        'desc'
      );

      return {
        name: spec.name,
        types: spec.esTypes ?? [],
        empty: !nonEmptyFields.has(spec.name),
        cardinality: countByValues.size || null,
        values: uniq(sortedValues.flatMap(({ value }) => value)),
      };
    });

    return {
      sampled: uniqueHits.length,
      total: totalDocs,
      fields,
    };
  },
});

const analyzeServiceCandidateRoute = createDataOnboardingServerRoute({
  endpoint: 'POST /internal/data_onboarding/tasks/analyze_service_candidate',
  options: {
    tags: [],
  },
  params: t.type({
    body: t.type({
      datasets: t.array(t.string),
      start: toNumberRt,
      end: toNumberRt,
      terms: t.array(
        t.type({
          field: t.string,
          value: t.string,
        })
      ),
    }),
  }),
  handler: async (
    resources
  ): Promise<{
    distributions: Record<string, { totalDocCount: number; distributions: DistributionTree[] }>;
    empty: string[];
  }> => {
    const core = await resources.context.core;

    const { start, end, datasets, terms } = resources.params.body;

    const asCurrentUser = createObservabilityEsClient({
      client: core.elasticsearch.client.asCurrentUser,
      logger: resources.logger,
      plugin: 'data_onboarding',
    });

    function getAggregationsForTerm(
      term: { field: string; value: string },
      availableTerms: Array<{ field: string; value: string }>
    ): [string, { filter: QueryDslQueryContainer; aggs: MaybeNestedFilterAggregationMap }] {
      const otherTerms = availableTerms.filter(
        (otherTerm) => otherTerm.field !== term.field && term.value !== otherTerm.value
      );

      return [
        `${term.field}:${term.value}`,
        {
          filter: {
            term: {
              [term.field]: term.value,
            },
          },
          aggs: Object.fromEntries(
            otherTerms.map((otherTerm) => getAggregationsForTerm(otherTerm, otherTerms))
          ),
        },
      ];
    }

    const aggregations = Object.fromEntries(
      terms.map((term) => {
        return getAggregationsForTerm(term, terms);
      })
    );

    function buildTreeForTerm(
      aggregationKey: string,
      aggregationResult: AggregateOfMap<MaybeNestedFilterAggregationMap, never>[string],
      docCountForParent: number
    ): DistributionTree {
      const { doc_count: docCount, ...rest } = aggregationResult;

      const [field, ...values] = aggregationKey.split(':');

      const availability =
        docCount > 0
          ? docCount >= docCountForParent
            ? ('all' as const)
            : ('some' as const)
          : ('none' as const);

      return {
        filter: [field, ...values].join(':'),
        docCount,
        availability,
        children: Object.entries(rest).map(([subAggregationKey, subAggregationResult]) => {
          return buildTreeForTerm(subAggregationKey, subAggregationResult, docCount);
        }),
      };
    }

    const limiter = pLimit(5);

    const distributions = await Promise.all(
      datasets.map(async (dataset) =>
        limiter(async () => {
          const response = await asCurrentUser.search('get_distribution_for_dataset', {
            index: dataset,
            size: 0,
            track_total_hits: true,
            body: {
              query: {
                bool: {
                  filter: [...rangeQuery(start, end)],
                },
              },
              aggs: {
                global: {
                  filter: {
                    match_all: {},
                  },
                  aggs: aggregations,
                },
              },
            },
          });

          if (!response.aggregations) {
            return {
              dataset,
              totalDocCount: 0,
              distributions: [],
            };
          }

          const { doc_count: totalDocCount, ...aggregationResults } = response.aggregations.global;

          return {
            dataset,
            totalDocCount,
            distributions: Object.entries(aggregationResults).map(
              ([aggregationKey, aggregationResult]) => {
                return buildTreeForTerm(aggregationKey, aggregationResult, totalDocCount);
              }
            ),
          };
        })
      )
    );

    const [distributionsWithData, distributionsWithoutData] = partition(
      distributions,
      ({ distributions: distributionsForDataset }) => {
        return distributionsForDataset.some((distribution) => distribution.docCount > 0);
      }
    );

    return {
      distributions: Object.fromEntries(
        distributionsWithData.map((distribution) => {
          return [
            distribution.dataset,
            {
              totalDocCount: distribution.totalDocCount,
              distributions: distribution.distributions,
            },
          ];
        })
      ),
      empty: distributionsWithoutData.map(({ dataset }) => dataset),
    };
  },
});

export const tasksRoutes = {
  ...sampleDocumentsRoute,
  ...analyzeServiceCandidateRoute,
};
