/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBasicTableProps,
  DefaultItemAction,
  EuiTableSelectionType,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ValuesType } from 'utility-types';
import { EuiText } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { AlertSeverity } from '../../../../../alerts/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { AlertType } from '../../../../common/alert_types';
import { TimestampTooltip } from '../../shared/TimestampTooltip';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';

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

  const columns: Array<EuiBasicTableColumn<AlertItem>> = [
    {
      field: 'timestamp',
      name: 'Last updated',
      render: (_, { timestamp }) => (
        <TimestampTooltip time={timestamp} timeUnit="minutes" />
      ),
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
      field: 'severity_level',
      name: 'Severity',
      render: (_, { severity_level: severityLevel }) => {
        switch (severityLevel) {
          case AlertSeverity.Warning:
            return (
              <EuiBadge color="warning">
                {i18n.translate(
                  'xpack.apm.alertInventory.severityLabel.warning',
                  { defaultMessage: 'warning' }
                )}
              </EuiBadge>
            );

          case AlertSeverity.Critical:
            return (
              <EuiBadge color="danger">
                {i18n.translate(
                  'xpack.apm.alertInventory.severityLabel.warning',
                  { defaultMessage: 'critical' }
                )}
              </EuiBadge>
            );
        }
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
        }

        return <EuiLink href={href}>{reason}</EuiLink>;
      },
      width: '50%',
    },
    {
      actions,
      name: 'Actions',
    },
  ];
  return (
    <EuiBasicTable<AlertItem>
      {...props}
      isSelectable={true}
      selection={[] as EuiTableSelectionType<AlertItem>}
      columns={columns}
      pagination={{ pageIndex: 0, pageSize: 0, totalItemCount: 0 }}
    />
  );
}
