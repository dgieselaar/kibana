/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import React, { useMemo, useState } from 'react';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { getIndexPatternsForFilters } from '@kbn/entities-api-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { ControlledEntityTable } from './controlled_entity_table';
import { useEntitiesAppFetch } from '../../hooks/use_entities_app_fetch';

export function EntityTable({ type }: { type: 'all' | string }) {
  const {
    dependencies: {
      start: {
        dataViews,
        data,
        entitiesAPI: { entitiesAPIClient },
      },
    },
  } = useKibana();

  const {
    timeRange,
    setTimeRange,
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const [displayedKqlFilter, setDisplayedKqlFilter] = useState('');
  const [persistedKqlFilter, setPersistedKqlFilter] = useState('');

  const [selectedType, setSelectedType] = useState(type);

  const [sort, setSort] = useState<{ field: string; order: 'asc' | 'desc' }>({
    field: 'entity.displayName',
    order: 'desc',
  });

  const definitionsMetadataFetch = useEntitiesAppFetch(
    ({ signal }) => {
      return entitiesAPIClient.fetch('POST /internal/entities_api/definitions/metadata', {
        signal,
        params: {
          body: {
            types: [selectedType],
          },
        },
      });
    },
    [entitiesAPIClient, selectedType]
  );

  const queryFetch = useEntitiesAppFetch(
    ({ signal }) => {
      return entitiesAPIClient.fetch('POST /internal/entities_api/entities', {
        signal,
        params: {
          body: {
            start,
            end,
            kuery: persistedKqlFilter,
            types: [selectedType],
            sortField: sort.field as any,
            sortOrder: sort.order,
          },
        },
      });
    },
    [entitiesAPIClient, selectedType, persistedKqlFilter, start, end, sort.field, sort.order]
  );

  const [pagination, setPagination] = useState<{ pageSize: number; pageIndex: number }>({
    pageSize: 10,
    pageIndex: 0,
  });

  const entities = useMemo(() => {
    return queryFetch.value?.entities ?? [];
  }, [queryFetch.value]);

  const dataViewsFetch = useAbortableAsync(() => {
    if (!definitionsMetadataFetch.value) {
      return undefined;
    }

    const allIndexPatterns = definitionsMetadataFetch.value.definitions.flatMap((definition) =>
      getIndexPatternsForFilters(definition.filters)
    );

    return dataViews
      .create(
        {
          title: allIndexPatterns.join(', '),
          timeFieldName: '@timestamp',
        },
        false, // skip fetch fields
        true // display errors
      )
      .then((response) => {
        return [response];
      });
  }, [dataViews, definitionsMetadataFetch.value]);

  return (
    <ControlledEntityTable
      timeRange={timeRange}
      onTimeRangeChange={(nextTimeRange) => {
        setTimeRange(nextTimeRange);
      }}
      rows={entities}
      loading={queryFetch.loading}
      kqlFilter={displayedKqlFilter}
      onKqlFilterChange={(next) => {
        setDisplayedKqlFilter(next);
      }}
      onKqlFilterSubmit={() => {
        setPersistedKqlFilter(displayedKqlFilter);
      }}
      onPaginationChange={(next) => {
        setPagination(next);
      }}
      pagination={pagination}
      totalItemCount={entities.length}
      columns={[]}
      dataViews={dataViewsFetch.value}
      showTypeSelect={type === 'all'}
      onSelectedTypeChange={(nextType) => {
        setSelectedType(nextType);
      }}
      onSortChange={(nextSort) => {
        setSort(nextSort);
      }}
      sort={sort}
    />
  );
}
