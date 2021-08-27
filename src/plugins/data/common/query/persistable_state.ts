/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter } from '@kbn/es-query';
import type { SerializableRecord } from '@kbn/utility-types';
import uuid from 'uuid';
import type { SavedObjectReference } from '../../../../core/types/saved_objects';

export const extract = (filters: Filter[]) => {
  const references: SavedObjectReference[] = [];
  const updatedFilters = filters.map((filter) => {
    if (filter.meta?.index) {
      const id = uuid();
      references.push({
        type: 'index_pattern',
        name: id,
        id: filter.meta.index,
      });

      return {
        ...filter,
        meta: {
          ...filter.meta,
          index: id,
        },
      };
    }
    return filter;
  });
  return { state: updatedFilters, references };
};

export const inject = (filters: Filter[], references: SavedObjectReference[]) => {
  return filters.map((filter) => {
    if (!filter.meta.index) {
      return filter;
    }
    const reference = references.find((ref) => ref.name === filter.meta.index);
    return {
      ...filter,
      meta: {
        ...filter.meta,
        index: reference && reference.id,
      },
    };
  });
};

export const telemetry = (filters: SerializableRecord, collector: unknown) => {
  return {};
};

export const migrateToLatest = (filters: Filter[], version: string) => {
  return filters;
};

export const getAllMigrations = () => {
  return {};
};
