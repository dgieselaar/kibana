/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import type { TimeUnit } from '../../../../common/utils/formatters/datetime';
import { asAbsoluteDateTime } from '../../../../common/utils/formatters/datetime';

interface Props {
  /**
   * timestamp in milliseconds
   */
  time: number;
  timeUnit?: TimeUnit;
}

export function TimestampTooltip({ time, timeUnit = 'milliseconds' }: Props) {
  const absoluteTimeLabel = asAbsoluteDateTime(time, timeUnit);

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <>{absoluteTimeLabel}</>
    </EuiToolTip>
  );
}
