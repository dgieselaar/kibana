/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Summary } from '.';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { TimestampTooltip } from '../TimestampTooltip';
import { DurationSummaryItem } from './DurationSummaryItem';
import { ErrorCountSummaryItemBadge } from './error_count_summary_item_badge';
import { HttpInfoSummaryItem } from './http_info_summary_item';
import { TransactionResultSummaryItem } from './TransactionResultSummaryItem';
import { UserAgentSummaryItem } from './UserAgentSummaryItem';

interface Props {
  transaction: Transaction;
  totalDuration: number | undefined;
  errorCount: number;
}

function getTransactionResultSummaryItem(transaction: Transaction) {
  const result = transaction.transaction.result;
  const url = transaction.url?.full || transaction.transaction?.page?.url;

  if (url) {
    const method = transaction.http?.request?.method;
    const status = transaction.http?.response?.status_code;

    return <HttpInfoSummaryItem method={method} status={status} url={url} />;
  }

  if (result) {
    return <TransactionResultSummaryItem transactionResult={result} />;
  }

  return null;
}

function TransactionSummary({ transaction, totalDuration, errorCount }: Props) {
  const items = [
    <TimestampTooltip time={transaction.timestamp.us / 1000} />,
    <DurationSummaryItem
      duration={transaction.transaction.duration.us}
      totalDuration={totalDuration}
      parentType="trace"
    />,
    getTransactionResultSummaryItem(transaction),
    errorCount ? <ErrorCountSummaryItemBadge count={errorCount} /> : null,
    transaction.user_agent ? (
      <UserAgentSummaryItem {...transaction.user_agent} />
    ) : null,
  ];

  return <Summary items={items} />;
}

export { TransactionSummary };
