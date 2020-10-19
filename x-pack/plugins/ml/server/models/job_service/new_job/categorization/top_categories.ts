/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { ML_RESULTS_INDEX_PATTERN } from '../../../../../common/constants/index_patterns';
import { CategoryId, Category } from '../../../../../common/types/categories';

export function topCategoriesProvider({ asInternalUser }: IScopedClusterClient) {
  async function getTotalCategories(jobId: string): Promise<number> {
    const { body } = await asInternalUser.search({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  job_id: jobId,
                },
              },
              {
                exists: {
                  field: 'category_id',
                },
              },
            ],
          },
        },
      },
    });
    return body?.hits?.total?.value ?? 0;
  }

  async function getTopCategoryCounts(jobId: string, numberOfCategories: number) {
    const { body } = await asInternalUser.search({
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  job_id: jobId,
                },
              },
              {
                term: {
                  result_type: 'model_plot',
                },
              },
              {
                term: {
                  by_field_name: 'mlcategory',
                },
              },
            ],
          },
        },
        aggs: {
          cat_count: {
            terms: {
              field: 'by_field_value',
              size: numberOfCategories,
            },
          },
        },
      },
    });

    const catCounts =
      body.aggregations?.cat_count?.buckets.map((c) => ({
        id: c.key as CategoryId,
        count: c.doc_count,
      })) ?? [];
    return catCounts || [];
  }

  async function getCategories(
    jobId: string,
    catIds: CategoryId[],
    size: number
  ): Promise<Category[]> {
    const categoryFilter = catIds.length
      ? {
          terms: {
            category_id: catIds,
          },
        }
      : {
          exists: {
            field: 'category_id',
          },
        };

    const { body } = await asInternalUser.search<Category>({
      index: ML_RESULTS_INDEX_PATTERN,
      size,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  job_id: jobId,
                },
              },
              categoryFilter,
            ],
          },
        },
      },
    });

    return body.hits.hits?.map((c) => c._source) || [];
  }

  async function topCategories(jobId: string, numberOfCategories: number) {
    const catCounts = await getTopCategoryCounts(jobId, numberOfCategories);
    const categories = await getCategories(
      jobId,
      catCounts.map((c) => c.id),
      catCounts.length || numberOfCategories
    );

    const catsById = categories.reduce((p, c) => {
      p[c.category_id] = c;
      return p;
    }, {} as { [id: number]: Category });

    const total = await getTotalCategories(jobId);

    if (catCounts.length) {
      return {
        total,
        categories: catCounts.map(({ id, count }) => {
          return {
            count,
            category: catsById[id] ?? null,
          };
        }),
      };
    } else {
      return {
        total,
        categories: categories.map((category) => {
          return {
            category,
          };
        }),
      };
    }
  }

  return {
    topCategories,
  };
}
