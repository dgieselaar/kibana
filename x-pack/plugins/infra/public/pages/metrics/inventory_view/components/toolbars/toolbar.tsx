/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import type { IIndexPattern } from '../../../../../../../../../src/plugins/data/common/index_patterns/types';
import type { InventoryCloudAccount } from '../../../../../../common/http_api/inventory_meta_api';
import type {
  SnapshotCustomMetricInput,
  SnapshotGroupBy,
  SnapshotMetricInput,
} from '../../../../../../common/http_api/snapshot_api';
import { findToolbar } from '../../../../../../common/inventory_models/toolbars';
import type { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { useSourceContext } from '../../../../../containers/metrics_source/source';
import type { InfraGroupByOptions } from '../../../../../lib/lib';
import { useInventoryMeta } from '../../hooks/use_inventory_meta';
import type { WaffleOptionsState, WaffleSortOption } from '../../hooks/use_waffle_options';
import { ToolbarWrapper } from './toolbar_wrapper';

export interface ToolbarProps extends Omit<WaffleOptionsState, 'boundsOverride' | 'autoBounds'> {
  createDerivedIndexPattern: (type: 'metrics') => IIndexPattern;
  changeMetric: (payload: SnapshotMetricInput) => void;
  changeGroupBy: (payload: SnapshotGroupBy) => void;
  changeCustomOptions: (payload: InfraGroupByOptions[]) => void;
  changeAccount: (id: string) => void;
  changeRegion: (name: string) => void;
  changeSort: (sort: WaffleSortOption) => void;
  accounts: InventoryCloudAccount[];
  regions: string[];
  changeCustomMetrics: (payload: SnapshotCustomMetricInput[]) => void;
}

const wrapToolbarItems = (
  ToolbarItems: FunctionComponent<ToolbarProps>,
  accounts: InventoryCloudAccount[],
  regions: string[]
) => {
  return (
    <ToolbarWrapper>
      {(props) => (
        <>
          <ToolbarItems {...props} accounts={accounts} regions={regions} />
          <EuiFlexItem grow={true} />
        </>
      )}
    </ToolbarWrapper>
  );
};

interface Props {
  nodeType: InventoryItemType;
  currentTime: number;
}

export const Toolbar = ({ nodeType, currentTime }: Props) => {
  const { sourceId } = useSourceContext();
  const { accounts, regions } = useInventoryMeta(sourceId, nodeType, currentTime);
  const ToolbarItems = findToolbar(nodeType);
  return wrapToolbarItems(ToolbarItems, accounts, regions);
};
