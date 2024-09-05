/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  CriteriaWithPagination,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiLink,
  EuiSearchBar,
} from '@elastic/eui';
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useInventoryRouter } from '../../hooks/use_inventory_router';

export function ControlledEntityTable<TEntity extends { id: string; name: string; type: string }>({
  rows,
  columns,
  loading,
  query,
  onQueryChange,
  onQuerySubmit,
  pagination: { pageSize, pageIndex },
  onPaginationChange,
  totalItemCount,
}: {
  rows: TEntity[];
  columns: Array<EuiBasicTableColumn<TEntity>>;
  query: string;
  onQueryChange: (nextQuery: string) => void;
  onQuerySubmit: () => void;
  loading: boolean;
  pagination: { pageSize: number; pageIndex: number };
  onPaginationChange: (pagination: { pageSize: number; pageIndex: number }) => void;
  totalItemCount: number;
}) {
  const router = useInventoryRouter();

  const displayedColumns = useMemo<Array<EuiBasicTableColumn<TEntity>>>(() => {
    return [
      {
        field: 'name',
        name: i18n.translate('xpack.inventory.entityTable.nameColumnLabel', {
          defaultMessage: 'Name',
        }),
        width: '80%',
        render: (_, { id, type, name }) => {
          return (
            <EuiLink
              data-test-subj="inventoryColumnsLink"
              href={router.link('/{type}/{id}', {
                path: {
                  id,
                  type,
                },
              })}
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'type',
        name: i18n.translate('xpack.inventory.entityTable.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        render: (_, { type }) => {
          return <EuiBadge>{type}</EuiBadge>;
        },
      },
    ];
  }, [router]);

  return (
    <EuiFlexGroup direction="column">
      <EuiSearchBar
        query={query}
        onChange={({ queryText }) => {
          onQueryChange(queryText);
        }}
        box={{
          onChange: (event) => {
            onQueryChange(event.currentTarget.value);
          },
          placeholder: i18n.translate('xpack.inventory.entityTable.filterEntitiesPlaceholder', {
            defaultMessage: 'Filter entities',
          }),
        }}
      />
      <EuiBasicTable<TEntity>
        columns={displayedColumns}
        items={rows}
        itemId="name"
        pagination={{
          pageSize,
          pageIndex,
          totalItemCount,
        }}
        loading={loading}
        noItemsMessage={i18n.translate('xpack.inventory.entityTable.noItemsMessage', {
          defaultMessage: `No entities found`,
        })}
        onChange={(criteria: CriteriaWithPagination<TEntity>) => {
          const { size, index } = criteria.page;
          onPaginationChange({ pageIndex: index, pageSize: size });
        }}
      />
    </EuiFlexGroup>
  );
}
