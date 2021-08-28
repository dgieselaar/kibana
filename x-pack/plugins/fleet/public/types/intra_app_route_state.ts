/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApplicationStart } from '../../../../../src/core/public/application/types';
import type { PackagePolicy } from '../../common/types/models/package_policy';

/**
 * Supported routing state for the create package policy page routes
 */
export interface CreatePackagePolicyRouteState {
  /** On a successful save of the package policy, use navigate to the given app */
  onSaveNavigateTo?:
    | Parameters<ApplicationStart['navigateToApp']>
    | ((newPackagePolicy: PackagePolicy) => Parameters<ApplicationStart['navigateToApp']>);
  /** On cancel, navigate to the given app */
  onCancelNavigateTo?: Parameters<ApplicationStart['navigateToApp']>;
  /** Url to be used on cancel links */
  onCancelUrl?: string;
}

/**
 * Supported routing state for the agent policy details page routes with deploy agents action
 */
export interface AgentPolicyDetailsDeployAgentAction {
  /** On done, navigate to the given app */
  onDoneNavigateTo?: Parameters<ApplicationStart['navigateToApp']>;
}

/**
 * Supported routing state for the agent policy details page routes with deploy agents action
 */
export interface AgentDetailsReassignPolicyAction {
  /** On done, navigate to the given app */
  onDoneNavigateTo?: Parameters<ApplicationStart['navigateToApp']>;
}

export interface IntegrationsAppBrowseRouteState {
  /** The agent policy that we are browsing integrations for */
  forAgentPolicyId: string;
}

/**
 * All possible Route states.
 */
export type AnyIntraAppRouteState =
  | CreatePackagePolicyRouteState
  | AgentPolicyDetailsDeployAgentAction
  | AgentDetailsReassignPolicyAction;
