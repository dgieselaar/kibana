/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiPage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { useFetcher } from '../../../hooks/useFetcher';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import { KueryBar } from '../../shared/KueryBar';
import { SearchBar } from '../../shared/search_bar';
import { UserAnalyticsChart } from './user_analytics_chart';

const PageFlexGroup = styled(EuiFlexGroup)`
  margin: ${({ theme }) =>
    `${theme.eui.euiSizeM} ${theme.eui.euiSizeM} -${theme.eui.gutterTypes.gutterMedium} ${theme.eui.euiSizeM}`};
`;

export function UserAnalytics() {
  const { data: userAnalyticsIndexPattern } = useFetcher(() => {
    return callApmApi({
      endpoint: 'GET /api/apm/user_analytics/dynamic_index_pattern',
    });
  }, []);

  return (
    <>
      <SearchBar
        kueryBar={
          <KueryBar
            indexPattern={userAnalyticsIndexPattern}
            placeholder={i18n.translate(
              'xpack.apm.userAnalytics.kuerybarPlaceholder',
              { defaultMessage: 'Search for user analytics events' }
            )}
          />
        }
      />
      <EuiPage>
        <PageFlexGroup>
          <UserAnalyticsChart />
        </PageFlexGroup>
      </EuiPage>
    </>
  );
}
