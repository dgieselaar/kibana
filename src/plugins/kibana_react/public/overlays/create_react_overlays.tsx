/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import type { KibanaServices } from '../context/types';
import { toMountPoint } from '../util/to_mount_point';
import type { KibanaReactOverlays } from './types';

export const createReactOverlays = (services: KibanaServices): KibanaReactOverlays => {
  const checkCoreService = () => {
    if (!services.overlays) {
      throw new TypeError('Could not show overlay as overlays service is not available.');
    }
  };

  const openFlyout: KibanaReactOverlays['openFlyout'] = (node, options?) => {
    checkCoreService();
    return services.overlays!.openFlyout(toMountPoint(<>{node}</>), options);
  };

  const openModal: KibanaReactOverlays['openModal'] = (node, options?) => {
    checkCoreService();
    return services.overlays!.openModal(toMountPoint(<>{node}</>), options);
  };

  const overlays: KibanaReactOverlays = {
    openFlyout,
    openModal,
  };

  return overlays;
};
