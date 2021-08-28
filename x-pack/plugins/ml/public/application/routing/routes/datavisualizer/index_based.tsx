/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { parse } from 'query-string';
import type { FC } from 'react';
import React from 'react';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { checkGetJobsCapabilitiesResolver } from '../../../capabilities/check_capabilities';
import { useCreateAndNavigateToMlLink } from '../../../contexts/kibana/use_create_url';
import type { NavigateToPath } from '../../../contexts/kibana/use_navigate_to_path';
import { IndexDataVisualizerPage as Page } from '../../../datavisualizer/index_based/index_data_visualizer';
import { checkBasicLicense } from '../../../license/check_license';
import { checkMlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';
import { loadIndexPatterns } from '../../../util/index_utils';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import type { MlRoute, PageProps } from '../../router';
import { PageLoader } from '../../router';
import { useResolver } from '../../use_resolver';

export const indexBasedRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/jobs/new_job/datavisualizer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.indexLabel', {
        defaultMessage: 'Index',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;
  const redirectToJobsManagementPage = useCreateAndNavigateToMlLink(
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE
  );

  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context } = useResolver(index, savedSearchId, deps.config, {
    checkBasicLicense,
    loadIndexPatterns: () => loadIndexPatterns(deps.indexPatterns),
    checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
    checkMlNodesAvailable: () => checkMlNodesAvailable(redirectToJobsManagementPage),
  });

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
