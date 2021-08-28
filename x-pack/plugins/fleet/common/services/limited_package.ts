/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AgentPolicy } from '../types/models/agent_policy';
import type { PackageInfo } from '../types/models/epm';
import type { PackagePolicy } from '../types/models/package_policy';

export const isPackageLimited = (packageInfo: PackageInfo): boolean => {
  return (packageInfo.policy_templates || []).some(
    (policyTemplate) => policyTemplate.multiple === false
  );
};

export const doesAgentPolicyAlreadyIncludePackage = (
  agentPolicy: AgentPolicy,
  packageName: string
): boolean => {
  if (agentPolicy.package_policies.length && typeof agentPolicy.package_policies[0] === 'string') {
    throw new Error('Unable to read full package policy information');
  }
  return (agentPolicy.package_policies as PackagePolicy[])
    .map((packagePolicy) => packagePolicy.package?.name || '')
    .includes(packageName);
};
