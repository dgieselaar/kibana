/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { ObservabilityAlertRegistry } from '../../../../observability/server';
import { registerTransactionDurationAlertType } from './register_transaction_duration_alert_type';
import { registerTransactionDurationAnomalyAlertType } from './register_transaction_duration_anomaly_alert_type';
import { registerErrorCountAlertType } from './register_error_count_alert_type';
import { APMConfig } from '../..';
import { MlPluginSetup } from '../../../../ml/server';
import { registerTransactionErrorRateAlertType } from './register_transaction_error_rate_alert_type';

interface Params {
  alerts: ObservabilityAlertRegistry;
  ml?: MlPluginSetup;
  config$: Observable<APMConfig>;
}

export function registerApmAlerts(params: Params) {
  registerTransactionDurationAlertType({
    alerts: params.alerts,
    config$: params.config$,
  });
  registerTransactionDurationAnomalyAlertType({
    alerts: params.alerts,
    ml: params.ml,
    config$: params.config$,
  });
  registerErrorCountAlertType({
    alerts: params.alerts,
    config$: params.config$,
  });
  registerTransactionErrorRateAlertType({
    alerts: params.alerts,
    config$: params.config$,
  });
}
