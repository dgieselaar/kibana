/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionSchema } from '@kbn/entities-schema';
import { rawEntityDefinition } from '../helpers/fixtures/entity_definition';
import {
  generateHistoryMetadataAggregations,
  generateLatestMetadataAggregations,
} from './generate_metadata_aggregations';

describe('Generate Metadata Aggregations for history and latest', () => {
  describe('generateHistoryMetadataAggregations()', () => {
    it('should generate metadata aggregations for string format', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: ['host.name'],
      });
      expect(generateHistoryMetadataAggregations(definition)).toEqual({
        'entity.metadata.host.name': {
          terms: {
            field: 'host.name',
            size: 1000,
          },
        },
      });
    });

    it('should generate metadata aggregations for object format with only source', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [{ source: 'host.name' }],
      });
      expect(generateHistoryMetadataAggregations(definition)).toEqual({
        'entity.metadata.host.name': {
          terms: {
            field: 'host.name',
            size: 1000,
          },
        },
      });
    });

    it('should generate metadata aggregations for object format with source and limit', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [{ source: 'host.name', limit: 10 }],
      });
      expect(generateHistoryMetadataAggregations(definition)).toEqual({
        'entity.metadata.host.name': {
          terms: {
            field: 'host.name',
            size: 10,
          },
        },
      });
    });

    it('should generate metadata aggregations for object format with source, limit, and destination', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [{ source: 'host.name', limit: 10, destination: 'hostName' }],
      });
      expect(generateHistoryMetadataAggregations(definition)).toEqual({
        'entity.metadata.hostName': {
          terms: {
            field: 'host.name',
            size: 10,
          },
        },
      });
    });
  });

  describe('generateLatestMetadataAggregations()', () => {
    it('should generate metadata aggregations for string format', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: ['host.name'],
      });
      expect(generateLatestMetadataAggregations(definition)).toEqual({
        'entity.metadata.host.name': {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-360s',
              },
            },
          },
          aggs: {
            data: {
              terms: {
                field: 'host.name',
                size: 1000,
              },
            },
          },
        },
      });
    });

    it('should generate metadata aggregations for object format with only source', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [{ source: 'host.name' }],
      });
      expect(generateLatestMetadataAggregations(definition)).toEqual({
        'entity.metadata.host.name': {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-360s',
              },
            },
          },
          aggs: {
            data: {
              terms: {
                field: 'host.name',
                size: 1000,
              },
            },
          },
        },
      });
    });

    it('should generate metadata aggregations for object format with source and limit', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [{ source: 'host.name', limit: 10 }],
      });
      expect(generateLatestMetadataAggregations(definition)).toEqual({
        'entity.metadata.host.name': {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-360s',
              },
            },
          },
          aggs: {
            data: {
              terms: {
                field: 'host.name',
                size: 10,
              },
            },
          },
        },
      });
    });

    it('should generate metadata aggregations for object format with source, limit, and destination', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [{ source: 'host.name', limit: 10, destination: 'hostName' }],
      });
      expect(generateLatestMetadataAggregations(definition)).toEqual({
        'entity.metadata.hostName': {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-360s',
              },
            },
          },
          aggs: {
            data: {
              terms: {
                field: 'hostName',
                size: 10,
              },
            },
          },
        },
      });
    });
  });
});
