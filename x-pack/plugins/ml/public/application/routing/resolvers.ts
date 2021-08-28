/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IndexPatternsContract } from '../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_patterns';
import { checkGetJobsCapabilitiesResolver } from '../capabilities/check_capabilities';
import { checkFullLicense } from '../license/check_license';
import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';
import { loadMlServerInfo } from '../services/ml_server_info';
import { loadIndexPatterns, loadSavedSearches } from '../util/index_utils';

export interface Resolvers {
  [name: string]: () => Promise<any>;
}
export interface ResolverResults {
  [name: string]: any;
}

interface BasicResolverDependencies {
  indexPatterns: IndexPatternsContract;
  redirectToMlAccessDeniedPage: () => Promise<void>;
}

export const basicResolvers = ({
  indexPatterns,
  redirectToMlAccessDeniedPage,
}: BasicResolverDependencies): Resolvers => ({
  checkFullLicense,
  getMlNodeCount,
  loadMlServerInfo,
  loadIndexPatterns: () => loadIndexPatterns(indexPatterns),
  checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
  loadSavedSearches,
});
