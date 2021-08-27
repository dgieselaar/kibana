/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { httpStatusCodeToColor } from '../../../../utils/httpStatusCodeToColor';
import { statusCodes } from './statusCodes';

interface HttpStatusBadgeProps {
  status: number;
}
export function HttpStatusBadge({ status }: HttpStatusBadgeProps) {
  const label = i18n.translate('xpack.apm.transactionDetails.statusCode', {
    defaultMessage: 'Status code',
  });

  return (
    <EuiToolTip content={label}>
      <EuiBadge color={httpStatusCodeToColor(status) || 'default'}>
        {status} {statusCodes[status.toString()]}
      </EuiBadge>
    </EuiToolTip>
  );
}
