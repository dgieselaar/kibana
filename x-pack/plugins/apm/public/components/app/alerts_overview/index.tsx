/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFacetButton,
  EuiFacetGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageHeader,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';
import React, { useState } from 'react';
import { ExperimentalBadge } from '../../../../../observability/public';
import { asPercent } from '../../../../common/utils/formatters';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { DatePicker } from '../../shared/DatePicker';
import { KueryBar } from '../../shared/KueryBar';
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

  const { data: alerts = [] } = useFetcher(
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

  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>([]);

  const numAlerts = alerts.length;

  const topInfluencers = sortBy(
    alerts
      .flatMap((alert) => alert.influencers)
      .reduce((prev, influencer) => {
        let existing = prev.find((infl) => infl.tag === influencer);
        if (!existing) {
          existing = { tag: influencer, count: 0 };
          prev.push(existing);
        }
        existing.count += 1;
        return prev;
      }, [] as Array<{ tag: string; count: number }>),
    'count'
  )
    .reverse()
    .map((influencer) => {
      return {
        ...influencer,
        selected: selectedInfluencers.includes(influencer.tag),
        share: asPercent(influencer.count / numAlerts, 1),
      };
    });

  const displayedAlerts = selectedInfluencers.length
    ? alerts.filter((alert) =>
        selectedInfluencers.every((tag) => alert.influencers.includes(tag))
      )
    : alerts;

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
            {topInfluencers.length ? (
              <EuiFlexGroup direction="column" gutterSize="m">
                {/* <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h3>
                      {i18n.translate(
                        'xpack.observability.alertsInfluencersHeader',
                        { defaultMessage: 'Influencers' }
                      )}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem> */}
                <EuiFlexItem grow={false}>
                  <EuiPanel paddingSize="m">
                    <EuiFacetGroup gutterSize="s" layout="horizontal">
                      {topInfluencers.slice(0, 10).map((influencer) => (
                        <EuiFacetButton
                          key={influencer.tag}
                          quantity={influencer.count}
                          isSelected={influencer.selected}
                          onClick={() => {
                            const selected = influencer.selected;
                            setSelectedInfluencers((influencers) =>
                              selected
                                ? influencers.filter(
                                    (tag) => tag !== influencer.tag
                                  )
                                : influencers.concat(influencer.tag)
                            );
                          }}
                        >
                          {influencer.tag}
                        </EuiFacetButton>
                      ))}
                    </EuiFacetGroup>
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertsTable items={displayedAlerts} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>
    </EuiPage>
  );
}
