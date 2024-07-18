/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiPageHeader,
  EuiPageHeaderContent,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useDataOnboardingRouter } from '../hooks/use_data_onboarding_router';
import { useDataOnboardingRoutePath } from '../hooks/use_data_onboarding_route_path';
import { useKibana } from '../hooks/use_kibana';

const pageSectionContentClassName = css``;

export function DataOnboardingPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();

  const { PageTemplate } = observabilityShared.navigation;

  const path = useDataOnboardingRoutePath();

  const { link } = useDataOnboardingRouter();

  return (
    <PageTemplate
      restrictWidth
      pageSectionProps={{
        contentProps: {
          className: pageSectionContentClassName,
        },
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiPageHeader>
          <EuiPageHeaderContent>
            <EuiTitle size="l">
              <h1>
                {i18n.translate('xpack.dataOnboarding.dataOnboardingPageHeaderLabel', {
                  defaultMessage: 'Data discovery',
                })}
              </h1>
            </EuiTitle>
          </EuiPageHeaderContent>
        </EuiPageHeader>
        <EuiTabs>
          <EuiTab isSelected={path === '/'} href={link('/')}>
            {i18n.translate('xpack.dataOnboarding.dataOnboardingPageTemplate.datasetsTabLabel', {
              defaultMessage: 'Datasets',
            })}
          </EuiTab>
          <EuiTab isSelected={path === '/services'} href={link('/services')}>
            {i18n.translate('xpack.dataOnboarding.dataOnboardingPageTemplate.servicesTabLabel', {
              defaultMessage: 'Services',
            })}
          </EuiTab>
        </EuiTabs>
        {children}
      </EuiFlexGroup>
    </PageTemplate>
  );
}
