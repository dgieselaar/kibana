/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import type { System } from './types';

export function useGenerateDescription() {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const generateDescription = useCallback((system: System) => {
    return Promise.resolve('description');
  }, []);

  return {
    generateDescription,
  };
}
