/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AlertTypeParams } from '../../../../alerting/common/alert';
import type { ObservabilityRuleTypeModel } from '../../../../observability/public/rules/create_observability_rule_type_registry';
import type { MetricExpressionParams } from '../../../server/lib/alerting/metric_threshold/types';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../server/lib/alerting/metric_threshold/types';
import { validateMetricThreshold } from './components/validation';
import { formatReason } from './rule_data_formatters';

interface MetricThresholdAlertTypeParams extends AlertTypeParams {
  criteria: MetricExpressionParams[];
}

export function createMetricThresholdAlertType(): ObservabilityRuleTypeModel<MetricThresholdAlertTypeParams> {
  return {
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    description: i18n.translate('xpack.infra.metrics.alertFlyout.alertDescription', {
      defaultMessage: 'Alert when the metrics aggregation exceeds the threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/observability/${docLinks.DOC_LINK_VERSION}/metrics-threshold-alert.html`;
    },
    alertParamsExpression: React.lazy(() => import('./components/expression')),
    validate: validateMetricThreshold,
    defaultActionMessage: i18n.translate(
      'xpack.infra.metrics.alerting.threshold.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} - \\{\\{context.group\\}\\} is in a state of \\{\\{context.alertState\\}\\}

Reason:
\\{\\{context.reason\\}\\}
`,
      }
    ),
    requiresAppContext: false,
    format: formatReason,
  };
}
