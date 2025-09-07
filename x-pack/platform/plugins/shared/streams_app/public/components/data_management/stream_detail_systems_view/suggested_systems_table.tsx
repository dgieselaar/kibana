/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';

export function SuggestedSystemsTable({
  systems,
  selectedSystems,
  setSelectedSystems,
}: {
  systems: System[];
  selectedSystems: System[];
  setSelectedSystems: (systems: System[]) => void;
}) {
  const items = useMemo(() => {
    return systems ?? [];
  }, [systems]);

  const columns = useMemo((): Array<EuiBasicTableColumn<System>> => {
    return [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.suggestedSystemsTable.systemNameColumnTitle', {
          defaultMessage: 'Name',
        }),
        render: (_, { name }) => <EuiText>{name}</EuiText>,
      },
      {
        field: 'filter',
        name: i18n.translate('xpack.streams.suggestedSystemsTable.systemFilterColumnTitle', {
          defaultMessage: 'Filter',
        }),
      },
    ];
  }, []);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false} />
      <EuiBasicTable
        data-test-subj="suggested-systems-table"
        columns={columns}
        itemId="name"
        items={items}
        selection={{
          onSelectionChange: setSelectedSystems,
          selected: selectedSystems,
          initialSelected: selectedSystems,
        }}
      />
    </EuiFlexGroup>
  );
}
