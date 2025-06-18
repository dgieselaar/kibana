/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bytePartition, fromExternalVariant } from '@kbn/std';
import pLimit from 'p-limit';
import { ElasticsearchClient } from '@kbn/core/server';
import { maskIndexName } from './mask_index_name';
import { EXCLUDE_DATA_STREAM_PATTERNS } from './constants';

export async function getTextFields({
  esClient,
  indices,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
}): Promise<Map<string, Map<string, Array<'text' | 'semantic_text'>>>> {
  const limiter = pLimit(5);

  const tokenizedIndices = new Set<string>();
  for (const name of indices) {
    tokenizedIndices.add(maskIndexName(name));
  }

  const patterns = Array.from(tokenizedIndices);

  const chunksForFieldCaps = bytePartition(patterns);

  const indexMappingsResponses = await Promise.all(
    chunksForFieldCaps.map((chunk) => {
      const indexOfChunk = chunk.concat(EXCLUDE_DATA_STREAM_PATTERNS);
      return limiter(() =>
        esClient
          .fieldCaps({
            index: indexOfChunk,
            fields: '*',
            types: ['text'],
            filter_path: `fields.*,-fields.*.object,-fields.*.nested`,
          })
          .then((response) => {
            const textFields = Object.entries(response.fields).flatMap(([field, { text }]) => {
              if (text && text.searchable) {
                return [field];
              }
              return [];
            });

            return esClient.indices
              .getFieldMapping({
                index: indexOfChunk,
                fields: textFields,
                filter_path: `*.mappings.*`,
              })
              .then((mappingResponse) => {
                return Object.entries(mappingResponse).flatMap(([indexName, { mappings }]) => {
                  const maskedIndexName = maskIndexName(indexName);
                  return {
                    maskedIndexName,
                    mappings,
                  };
                });
              });
          })
      );
    })
  );

  const indexNamesWithTextFields = indexMappingsResponses.flatMap((indexMappingResponse) => {
    return indexMappingResponse.flatMap(({ maskedIndexName, mappings }) => {
      return {
        maskedIndexName,
        fields: Object.entries(mappings).flatMap(([fieldName, { mapping }]) => {
          const type = fromExternalVariant(mapping).value?.type;
          if (type === 'semantic_text' || type === 'text') {
            return [{ fieldName, type }];
          }
          return [];
        }),
      };
    });
  });

  const fieldsPerIndexName: Map<string, Map<string, Array<'text' | 'semantic_text'>>> = new Map();

  indexNamesWithTextFields.forEach(({ maskedIndexName, fields }) => {
    const indexFieldMap = new Map<string, Array<'text' | 'semantic_text'>>();
    fieldsPerIndexName.set(maskedIndexName, indexFieldMap);
    fields.forEach(({ fieldName, type }) => {
      const types = indexFieldMap.get(fieldName) ?? [];
      if (!types.includes(type)) {
        types.push(type);
        indexFieldMap.set(fieldName, types);
      }
    });
  });

  return fieldsPerIndexName;
}
