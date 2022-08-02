/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { keyBy, orderBy } from 'lodash';
import React, { useContext, useMemo } from 'react';
import { TopNFunctions, TopNFunctionSortField } from '../../common/functions';
import { getCalleeFunction, getCalleeSource, StackFrameMetadata } from '../../common/profiling';
import { FunctionContext } from './contexts/function';

interface Row {
  rank: number;
  frame: StackFrameMetadata;
  samples: number;
  exclusiveCPU: number;
  inclusiveCPU: number;
  diff?: {
    rank: number;
    exclusiveCPU: number;
    inclusiveCPU: number;
  };
}

function CPUStat({ cpu, diffCPU }: { cpu: number; diffCPU: number | undefined }) {
  const cpuLabel = `${cpu.toFixed(2)}%`;
  if (diffCPU === undefined) {
    return <>{cpuLabel}</>;
  }
  const color = diffCPU < 0 ? 'success' : 'danger';
  const label = Math.abs(diffCPU) <= 0.01 ? '<0.01' : Math.abs(diffCPU).toFixed(2);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{cpuLabel}</EuiFlexItem>
      <EuiFlexItem>
        <EuiText color={color} size="s">
          ({label})
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const TopNFunctionsTable = ({
  sortDirection,
  sortField,
  onSortChange,
  comparisonTopNFunctions,
}: {
  sortDirection: 'asc' | 'desc';
  sortField: TopNFunctionSortField;
  onSortChange: (options: {
    sortDirection: 'asc' | 'desc';
    sortField: TopNFunctionSortField;
  }) => void;
  comparisonTopNFunctions?: TopNFunctions;
}) => {
  const ctx = useContext(FunctionContext);

  const totalCount: number = useMemo(() => {
    if (!ctx || !ctx.TotalCount || ctx.TotalCount === 0) {
      return 0;
    }

    return ctx.TotalCount;
  }, [ctx]);

  const rows: Row[] = useMemo(() => {
    if (!ctx || !ctx.TotalCount || ctx.TotalCount === 0) {
      return [];
    }

    const comparisonDataById = comparisonTopNFunctions
      ? keyBy(comparisonTopNFunctions.TopN, 'Id')
      : {};

    return ctx.TopN.filter((topN) => topN.CountExclusive > 0).map((topN, i) => {
      const comparisonRow = comparisonDataById?.[topN.Id];

      const inclusiveCPU = (topN.CountInclusive / ctx.TotalCount) * 100;
      const exclusiveCPU = (topN.CountExclusive / ctx.TotalCount) * 100;

      const diff =
        comparisonTopNFunctions && comparisonRow
          ? {
              rank: topN.Rank - comparisonRow.Rank,
              exclusiveCPU:
                exclusiveCPU -
                (comparisonRow.CountExclusive / comparisonTopNFunctions.TotalCount) * 100,
              inclusiveCPU:
                inclusiveCPU -
                (comparisonRow.CountInclusive / comparisonTopNFunctions.TotalCount) * 100,
            }
          : undefined;

      return {
        rank: topN.Rank,
        frame: topN.Frame,
        samples: topN.CountExclusive,
        exclusiveCPU,
        inclusiveCPU,
        diff,
      };
    });
  }, [ctx, comparisonTopNFunctions]);

  const theme = useEuiTheme();

  const columns: Array<EuiBasicTableColumn<Row>> = [
    {
      field: TopNFunctionSortField.Rank,
      name: i18n.translate('xpack.profiling.functionsView.rankColumnLabel', {
        defaultMessage: 'Rank',
      }),
    },
    {
      field: TopNFunctionSortField.Frame,
      name: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
        defaultMessage: 'Function',
      }),
      width: '100%',
      render: (_, { frame }) => (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <div>
              <EuiText size="s" style={{ fontWeight: 'bold' }}>
                {getCalleeFunction(frame)}
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">{getCalleeSource(frame) || '‎'}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: TopNFunctionSortField.Samples,
      name: i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
        defaultMessage: 'Samples',
      }),
    },
    {
      field: TopNFunctionSortField.ExclusiveCPU,
      name: i18n.translate('xpack.profiling.functionsView.exclusiveCpuColumnLabel', {
        defaultMessage: 'Exclusive CPU',
      }),
      render: (_, { exclusiveCPU, diff }) => {
        return <CPUStat cpu={exclusiveCPU} diffCPU={diff?.exclusiveCPU} />;
      },
    },
    {
      field: TopNFunctionSortField.InclusiveCPU,
      name: i18n.translate('xpack.profiling.functionsView.inclusiveCpuColumnLabel', {
        defaultMessage: 'Inclusive CPU',
      }),
      render: (_, { inclusiveCPU, diff }) => {
        return <CPUStat cpu={inclusiveCPU} diffCPU={diff?.inclusiveCPU} />;
      },
    },
  ];

  if (comparisonTopNFunctions) {
    columns.push({
      field: TopNFunctionSortField.Diff,
      name: i18n.translate('xpack.profiling.functionsView.diffColumnLabel', {
        defaultMessage: 'Diff',
      }),
      align: 'right',
      render: (_, { diff }) => {
        if (!diff) {
          return (
            <EuiText size="xs" color={theme.euiTheme.colors.primaryText}>
              {i18n.translate('xpack.profiling.functionsView.newLabel', { defaultMessage: 'New' })}
            </EuiText>
          );
        }

        if (diff.rank === 0) {
          return null;
        }

        const color = diff.rank > 0 ? 'success' : 'danger';
        const icon = diff.rank > 0 ? 'sortDown' : 'sortUp';

        return (
          <EuiBadge
            color={color}
            iconType={icon}
            iconSide="right"
            style={{ minWidth: '100%', textAlign: 'right' }}
          >
            {diff.rank}
          </EuiBadge>
        );
      },
    });
  }

  const totalSampleCountLabel = i18n.translate(
    'xpack.profiling.functionsView.totalSampleCountLabel',
    {
      defaultMessage: 'Total sample count',
    }
  );

  const sortedRows = orderBy(
    rows,
    (row) => {
      return sortField === TopNFunctionSortField.Frame
        ? getCalleeFunction(row.frame).toLowerCase()
        : row[sortField];
    },
    [sortDirection]
  );

  return (
    <>
      <EuiText size="xs">
        <strong>{totalSampleCountLabel}:</strong> {totalCount}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable
        items={sortedRows}
        columns={columns}
        tableLayout="auto"
        onChange={(criteria) => {
          onSortChange({
            sortDirection: criteria.sort!.direction,
            sortField: criteria.sort!.field as TopNFunctionSortField,
          });
        }}
        sorting={{
          enableAllColumns: true,
          sort: {
            direction: sortDirection,
            field: sortField,
          },
        }}
      />
    </>
  );
};
