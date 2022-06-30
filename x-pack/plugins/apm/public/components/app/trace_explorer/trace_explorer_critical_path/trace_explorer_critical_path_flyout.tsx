/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { SpanFlyout } from '../../transaction_details/waterfall_with_summary/waterfall_container/waterfall/span_flyout';
import { TransactionFlyout } from '../../transaction_details/waterfall_with_summary/waterfall_container/waterfall/transaction_flyout';

export function TraceExplorerCriticalPathFlyout({
  start,
  end,
  flyoutItemId,
  onFlyoutClose,
}: {
  start: string;
  end: string;
  flyoutItemId: string;
  onFlyoutClose: () => void;
}) {
  const { data } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/traces/critical_path/flyout', {
        params: {
          query: {
            start,
            end,
            flyoutItemId,
          },
        },
      });
    },
    [start, end, flyoutItemId]
  );

  const { span, transaction } = data ?? {};

  if (span) {
    return (
      <SpanFlyout
        span={span}
        parentTransaction={transaction}
        onClose={onFlyoutClose}
        spanLinksCount={{ linkedChildren: 0, linkedParents: 0 }}
      />
    );
  }

  if (transaction) {
    return (
      <TransactionFlyout
        transaction={transaction}
        spanLinksCount={{ linkedChildren: 0, linkedParents: 0 }}
        onClose={onFlyoutClose}
      />
    );
  }

  return null;
}
