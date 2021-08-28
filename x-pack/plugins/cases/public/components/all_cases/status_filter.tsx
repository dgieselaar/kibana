/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import React, { memo } from 'react';
import type { CaseStatusWithAllStatus } from '../../../common/ui/types';
import { StatusAll } from '../../../common/ui/types';
import { statuses } from '../status/config';
import { Status } from '../status/status';

interface Props {
  stats: Record<CaseStatusWithAllStatus, number | null>;
  selectedStatus: CaseStatusWithAllStatus;
  onStatusChanged: (status: CaseStatusWithAllStatus) => void;
  hiddenStatuses?: CaseStatusWithAllStatus[];
}

const StatusFilterComponent: React.FC<Props> = ({
  stats,
  selectedStatus,
  onStatusChanged,
  hiddenStatuses = [],
}) => {
  const caseStatuses = Object.keys(statuses) as CaseStatusWithAllStatus[];
  const options: Array<EuiSuperSelectOption<CaseStatusWithAllStatus>> = [StatusAll, ...caseStatuses]
    .filter((status) => !hiddenStatuses.includes(status))
    .map((status) => ({
      value: status,
      inputDisplay: (
        <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
          <EuiFlexItem grow={false}>
            <span>
              <Status type={status} />
            </span>
          </EuiFlexItem>
          {status !== StatusAll && <EuiFlexItem grow={false}>{` (${stats[status]})`}</EuiFlexItem>}
        </EuiFlexGroup>
      ),
      'data-test-subj': `case-status-filter-${status}`,
    }));

  return (
    <EuiSuperSelect
      options={options}
      valueOfSelected={selectedStatus}
      onChange={onStatusChanged}
      data-test-subj="case-status-filter"
    />
  );
};

export const StatusFilter = memo(StatusFilterComponent);
