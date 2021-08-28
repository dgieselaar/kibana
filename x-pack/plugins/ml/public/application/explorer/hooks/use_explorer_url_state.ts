/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ML_PAGES } from '../../../../common/constants/locator';
import type { ExplorerAppState } from '../../../../common/types/locator';
import { usePageUrlState } from '../../util/url_state';

export function useExplorerUrlState() {
  /**
   * Originally `mlExplorerSwimlane` resided directly in the app URL state (`_a` URL state key).
   * With current URL structure it has been moved under the `explorer` key of the app state (_a).
   */
  const [legacyExplorerState] = usePageUrlState<ExplorerAppState['mlExplorerSwimlane']>(
    'mlExplorerSwimlane'
  );

  return usePageUrlState<ExplorerAppState>(ML_PAGES.ANOMALY_EXPLORER, {
    mlExplorerSwimlane: legacyExplorerState,
    mlExplorerFilter: {},
  });
}
