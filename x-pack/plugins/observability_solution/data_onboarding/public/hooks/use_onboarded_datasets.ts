/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnboardedDataset } from '../../common/types';
import { useLocalStorage } from './use_local_storage';

export function useOnboardedDatasets() {
  const [onboardedDatasets, setOnboardedDatasets] = useLocalStorage(
    'observability.dataOnboarding.onboardedDatasets',
    [] as OnboardedDataset[]
  );

  return [onboardedDatasets, setOnboardedDatasets] as const;
}
