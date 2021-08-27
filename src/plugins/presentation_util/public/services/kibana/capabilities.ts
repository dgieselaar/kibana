/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PresentationUtilPluginStartDeps } from '../../types';
import type { PresentationCapabilitiesService } from '../capabilities';
import type { KibanaPluginServiceFactory } from '../create/factory';

export type CapabilitiesServiceFactory = KibanaPluginServiceFactory<
  PresentationCapabilitiesService,
  PresentationUtilPluginStartDeps
>;

export const capabilitiesServiceFactory: CapabilitiesServiceFactory = ({ coreStart }) => {
  const { dashboard, visualize, advancedSettings } = coreStart.application.capabilities;

  return {
    canAccessDashboards: () => Boolean(dashboard.show),
    canCreateNewDashboards: () => Boolean(dashboard.createNew),
    canSaveVisualizations: () => Boolean(visualize.save),
    canSetAdvancedSettings: () => Boolean(advancedSettings.save),
  };
};
