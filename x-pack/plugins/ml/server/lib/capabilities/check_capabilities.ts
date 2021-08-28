/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '../../../../../../src/core/server/http/router/request';
import { MlLicense } from '../../../common/license/ml_license';
import type {
  MlCapabilities,
  MlCapabilitiesKey,
  MlCapabilitiesResponse,
  ResolveMlCapabilities,
} from '../../../common/types/capabilities';
import { adminMlCapabilities } from '../../../common/types/capabilities';
import { mlLog } from '../log';
import type { MlClient } from '../ml_client/types';
import {
  InsufficientMLCapabilities,
  MLPrivilegesUninitialized,
  UnknownMLCapabilitiesError,
} from './errors';
import { upgradeCheckProvider } from './upgrade';

export function capabilitiesProvider(
  mlClient: MlClient,
  capabilities: MlCapabilities,
  mlLicense: MlLicense,
  isMlEnabledInSpace: () => Promise<boolean>
) {
  const { isUpgradeInProgress } = upgradeCheckProvider(mlClient);
  async function getCapabilities(): Promise<MlCapabilitiesResponse> {
    const upgradeInProgress = await isUpgradeInProgress();
    const isPlatinumOrTrialLicense = mlLicense.isFullLicense();
    const mlFeatureEnabledInSpace = await isMlEnabledInSpace();

    if (upgradeInProgress === true) {
      // if an upgrade is in progress, set all admin capabilities to false
      disableAdminPrivileges(capabilities);
    }

    return {
      capabilities,
      upgradeInProgress,
      isPlatinumOrTrialLicense,
      mlFeatureEnabledInSpace,
    };
  }
  return { getCapabilities };
}

function disableAdminPrivileges(capabilities: MlCapabilities) {
  Object.keys(adminMlCapabilities).forEach((k) => {
    capabilities[k as keyof MlCapabilities] = false;
  });
  capabilities.canCreateAnnotation = false;
  capabilities.canDeleteAnnotation = false;
}

export type HasMlCapabilities = (capabilities: MlCapabilitiesKey[]) => Promise<void>;

export function hasMlCapabilitiesProvider(resolveMlCapabilities: ResolveMlCapabilities) {
  return (request: KibanaRequest): HasMlCapabilities => {
    let mlCapabilities: MlCapabilities | null = null;
    return async (capabilities: MlCapabilitiesKey[]) => {
      try {
        mlCapabilities = await resolveMlCapabilities(request);
      } catch (e) {
        mlLog.error(e);
        throw new UnknownMLCapabilitiesError(`Unable to perform ML capabilities check ${e}`);
      }

      if (mlCapabilities === null) {
        throw new MLPrivilegesUninitialized('ML capabilities have not been initialized');
      }

      if (capabilities.every((c) => mlCapabilities![c] === true) === false) {
        throw new InsufficientMLCapabilities('Insufficient privileges to access feature');
      }
    };
  };
}
