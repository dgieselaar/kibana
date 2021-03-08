/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageHeader,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ExperimentalBadge } from '../../../../../observability/public';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { KueryBar } from '../../shared/KueryBar';
import { DatePicker } from '../../shared/DatePicker';
import { AlertsTable } from './alerts_table';

/**
 * This is just a placeholder for a working search bar.
 */
// function SearchBar() {
//   return (
//     <EuiSearchBar
//       box={{
//         placeholder:
//           '"domain": "ecommerce" AND ("service.name": "ProductCatalogService" …)',
//       }}
//       filters={[
//         {
//           type: 'field_value_toggle_group',
//           field: 'status',
//           items: [
//             {
//               value: 'open',
//               name: 'Open',
//             },
//             {
//               value: 'inProgress',
//               name: 'In progress',
//             },
//             {
//               value: 'closed',
//               name: 'Closed',
//             },
//           ],
//         },
//       ]}
//     />
//   );
// }

export function AlertsPage() {
  const {
    urlParams: { start, end, kuery },
  } = useUrlParams();

  const { data: indexPattern } = useFetcher((callApmApi) => {
    return callApmApi({
      endpoint: 'GET /api/apm/alerts/inventory/dynamic_index_pattern',
    });
  }, []);

  const kueryBarConfig = indexPattern
    ? {
        indexPattern,
        boolFilter: [
          {
            terms: {
              'event.action': [
                'new-instance',
                'active-instance',
                'recovered-instance',
              ],
            },
          },
        ],
        placeholder: i18n.translate(
          'xpack.observability.alerts.searchBarPlaceholder',
          {
            defaultMessage:
              '"domain": "ecommerce" AND ("service.name": "ProductCatalogService" …)',
          }
        ),
      }
    : undefined;

  const { data: alerts } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/alerts/inventory/top',
        params: {
          query: {
            start,
            end,
            kuery,
          },
        },
      });
    },
    [start, end, kuery]
  );

  return (
    <EuiPage>
      <EuiPageHeader
        pageTitle={
          <>
            {i18n.translate('xpack.observability.alertsTitle', {
              defaultMessage: 'Alerts',
            })}{' '}
            <ExperimentalBadge />
          </>
        }
        rightSideItems={[
          <EuiButton fill iconType="gear">
            {i18n.translate(
              'xpack.observability.alerts.manageDetectionRulesButtonLabel',
              {
                defaultMessage: 'Manage detection rules',
              }
            )}
          </EuiButton>,
        ]}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup direction="row">
              <EuiFlexItem grow>
                <KueryBar config={kueryBarConfig} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DatePicker />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertsTable items={alerts ?? []} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>
    </EuiPage>
  );
}
