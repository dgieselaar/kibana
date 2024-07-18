/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import { compact, keyBy } from 'lodash';
import { Minimatch } from 'minimatch';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { OnboardedDataset } from '../../../common/types';
import { useKibana } from '../../hooks/use_kibana';
import { useOnboardedDatasets } from '../../hooks/use_onboarded_datasets';

export function useDatasetsTreeView() {
  const {
    services: { apiClient },
  } = useKibana();

  const { value } = useAbortableAsync(
    ({ signal }) => {
      return apiClient('GET /internal/data_onboarding/datasets', {
        signal,
      }).then((response) => {
        const allByName = new Map<
          string,
          typeof response['dataStreams' | 'aliases' | 'indices'][number]
        >();

        [...response.aliases, ...response.dataStreams, ...response.indices].forEach((item) => {
          allByName.set(item.name, item);
        });

        return {
          ...response,
          allByName,
        };
      });
    },
    [apiClient]
  );

  const [onboardedDatasets, setOnboardedDatasets] = useOnboardedDatasets();

  const treeItems = useMemo(() => {
    if (!value) {
      return [];
    }

    const nodes: Node[] = [];

    const { dataViews, allByName } = value;

    const all = Array.from(allByName.keys());

    const onboardedDatasetsByName = keyBy(onboardedDatasets, (dataset) => dataset.name);

    dataViews.forEach((dataView) => {
      const matchers = dataView.title.split(',').map((part) => new Minimatch(part.trim()));

      const matchingDatasets = compact(
        all
          .filter((name) => {
            return matchers.some((matcher) => matcher.match(name));
          })
          .map((name) => allByName.get(name))
      ).map((thing) => {
        return {
          ...thing,
          onboarded: onboardedDatasetsByName[thing.name] as OnboardedDataset | undefined,
        };
      });

      const onboardedCount = matchingDatasets.filter((set) => !!set.onboarded).length;
      const totalCount = matchingDatasets.length;
      const notOnboardedCount = totalCount - onboardedCount;

      nodes.push({
        id: dataView.id,
        label: (
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>{dataView.name}</EuiFlexItem>
            {matchingDatasets.length ? (
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.dataOnboarding.treeItems.datasetsOnboardedCount', {
                  defaultMessage: '{onboardedCount} out of {total} onboarded',
                  values: {
                    onboardedCount,
                    total: matchingDatasets.length,
                  },
                })}
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
        children: matchingDatasets.map((thing) => {
          const node: Node = {
            id: thing.name,
            label: thing.name,
          };
          return node;
        }),
      });
    });

    return nodes;
  }, [value, onboardedDatasets]);

  return treeItems;
}
