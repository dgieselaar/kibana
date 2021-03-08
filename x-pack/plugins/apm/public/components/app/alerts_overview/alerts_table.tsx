/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DefaultItemAction,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBasicTableProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTableSelectionType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import React from 'react';
import { ValuesType } from 'utility-types';
import { AlertSeverity } from '../../../../../alerts/common';
import { AlertType } from '../../../../common/alert_types';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useTheme } from '../../../hooks/use_theme';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { SparkPlot } from '../../shared/charts/spark_plot';
import { TimestampTooltip } from '../../shared/TimestampTooltip';

type AlertItem = ValuesType<APIReturnType<'GET /api/apm/alerts/inventory/top'>>;

type AlertsTableProps = Omit<
  EuiBasicTableProps<AlertItem>,
  'columns' | 'isSelectable' | 'pagination' | 'selection'
>;

const actions: Array<DefaultItemAction<AlertItem>> = [
  {
    name: 'Alert details',
    description: 'Alert details',
    onClick: () => {},
    isPrimary: true,
  },
  {
    name: 'Open Alert',
    description: 'Open alert',
    onClick: () => {},
  },
  {
    name: 'Mark in progress',
    description: 'Mark in progress',
    onClick: () => {},
  },
  {
    name: 'Close alert',
    description: 'Close alert',
    onClick: () => {},
  },
];

export function AlertsTable(props: AlertsTableProps) {
  const { core } = useApmPluginContext();

  const {
    urlParams: { start, end },
  } = useUrlParams();

  const theme = useTheme();

  const columns: Array<EuiBasicTableColumn<AlertItem>> = [
    {
      field: 'timestamp',
      name: 'Status',
      render: (_, { timestamp, recovered }) => {
        return (
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            style={{ whiteSpace: 'nowrap' }}
          >
            <EuiFlexItem grow={false}>
              {recovered ? (
                <EuiBadge color="hollow">
                  {i18n.translate(
                    'xpack.apm.alertInventory.alertStatusRecovered',
                    { defaultMessage: 'Recovered' }
                  )}
                </EuiBadge>
              ) : (
                <EuiBadge color="accent">
                  {i18n.translate(
                    'xpack.apm.alertInventory.alertStatusActive',
                    { defaultMessage: 'Active' }
                  )}
                </EuiBadge>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TimestampTooltip time={timestamp} timeUnit="minutes" />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'severity_level',
      name: 'Severity',
      render: (_, { severity_level: severityLevel, timeseries }) => {
        let label: string = '';

        let color: string = 'default';

        switch (severityLevel) {
          case AlertSeverity.Warning:
            color = 'warning';
            label = i18n.translate(
              'xpack.apm.alertInventory.severityLabel.warning',
              { defaultMessage: 'warning' }
            );
            break;

          case AlertSeverity.Critical:
            color = 'danger';
            label = i18n.translate(
              'xpack.apm.alertInventory.severityLabel.warning',
              { defaultMessage: 'critical' }
            );
            break;
        }

        const euiColorKey = `euiColor${capitalize(
          color
        )}` as keyof typeof theme.eui;

        return (
          <EuiFlexGroup gutterSize="s">
            {label ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color={color}>{label}</EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <SparkPlot
                series={timeseries}
                color={euiColorKey}
                valueLabel={<></>}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'first_seen',
      name: 'First seen',
      render: (_, { first_seen: firstSeen }) => (
        <TimestampTooltip time={firstSeen} timeUnit="minutes" />
      ),
    },
    {
      field: 'rule_name',
      name: 'Rule name',
      render: (_, { rule_name: ruleName, rule_id: ruleId }) => {
        return (
          <EuiLink
            style={{ whiteSpace: 'nowrap' }}
            href={core.http.basePath.prepend(
              `/app/management/insightsAndAlerting/triggersActions/alert/${ruleId}`
            )}
          >
            {ruleName}
          </EuiLink>
        );
      },
    },
    {
      field: 'reason',
      name: 'Reason',
      render: (_, { reason, rule_type_id: ruleTypeId, fields }) => {
        let href: string | undefined;

        switch (ruleTypeId) {
          case AlertType.ErrorCount:
            href = core.http.basePath.prepend(
              `/app/apm/services/${
                fields['service.name']
              }/errors?start=${encodeURIComponent(
                start!
              )}&end=${encodeURIComponent(end!)}`
            );
            break;

          case AlertType.TransactionDuration:
            href = core.http.basePath.prepend(
              `/app/apm/services/${
                fields['service.name']
              }/?transactionType=${encodeURIComponent(
                String(fields['transaction.type'])
              )}&start=${encodeURIComponent(start!)}&end=${encodeURIComponent(
                end!
              )}`
            );
            break;
        }

        return (
          <EuiLink href={href} style={{ whiteSpace: 'nowrap' }}>
            {reason}
          </EuiLink>
        );
      },
    },
    {
      actions,
      name: 'Actions',
    },
  ];
  return (
    <EuiBasicTable<AlertItem>
      {...props}
      tableLayout="auto"
      isSelectable={true}
      selection={[] as EuiTableSelectionType<AlertItem>}
      columns={columns}
      pagination={{ pageIndex: 0, pageSize: 0, totalItemCount: 0 }}
    />
  );
}
