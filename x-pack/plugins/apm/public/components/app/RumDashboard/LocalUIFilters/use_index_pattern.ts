/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IndexPatternSpec } from '../../../../../../../../src/plugins/data/common';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import type { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useDynamicIndexPatternFetcher } from '../../../../hooks/use_dynamic_index_pattern';
import { useFetcher } from '../../../../hooks/use_fetcher';

export function useIndexPattern() {
  const { indexPattern: indexPatternDynamic } = useDynamicIndexPatternFetcher();

  const {
    services: {
      data: { indexPatterns },
    },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { data } = useFetcher<Promise<IndexPattern | undefined>>(async () => {
    if (indexPatternDynamic?.title) {
      return indexPatterns.create({
        pattern: indexPatternDynamic?.title,
      } as IndexPatternSpec);
    }
  }, [indexPatternDynamic?.title, indexPatterns]);

  return { indexPatternTitle: indexPatternDynamic?.title, indexPattern: data };
}
