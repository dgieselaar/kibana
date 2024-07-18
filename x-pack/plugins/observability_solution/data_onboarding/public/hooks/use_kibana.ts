/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { DataOnboardingStartDependencies } from '../types';
import type { DataOnboardingServices } from '../services/types';

export interface DataOnboardingKibanaContext {
  core: CoreStart;
  dependencies: { start: DataOnboardingStartDependencies };
  services: DataOnboardingServices;
}

const useTypedKibana = () => {
  return useKibana<DataOnboardingKibanaContext>().services;
};

export { useTypedKibana as useKibana };
