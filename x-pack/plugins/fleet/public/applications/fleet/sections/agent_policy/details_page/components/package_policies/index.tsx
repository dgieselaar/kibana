/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';

import type { AgentPolicy } from '../../../../../../../../common/types/models/agent_policy';
import type { PackagePolicy } from '../../../../../../../../common/types/models/package_policy';
import { useBreadcrumbs } from '../../../../../hooks/use_breadcrumbs';

import { NoPackagePolicies } from './no_package_policies';
import { PackagePoliciesTable } from './package_policies_table';

export const PackagePoliciesView = memo<{ agentPolicy: AgentPolicy }>(({ agentPolicy }) => {
  useBreadcrumbs('policy_details', { policyName: agentPolicy.name });

  if (agentPolicy.package_policies.length === 0) {
    return <NoPackagePolicies policyId={agentPolicy.id} />;
  }

  return (
    <PackagePoliciesTable
      agentPolicy={agentPolicy}
      packagePolicies={(agentPolicy.package_policies || []) as PackagePolicy[]}
    />
  );
});
