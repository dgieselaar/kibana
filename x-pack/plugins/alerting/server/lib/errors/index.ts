/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEsErrorMessage } from './es_error_parser';
import type { ElasticsearchError, ErrorThatHandlesItsOwnResponse } from './types';

export function isErrorThatHandlesItsOwnResponse(
  e: ErrorThatHandlesItsOwnResponse
): e is ErrorThatHandlesItsOwnResponse {
  return typeof (e as ErrorThatHandlesItsOwnResponse).sendResponse === 'function';
}

export { AlertTypeDisabledError, AlertTypeDisabledReason } from './alert_type_disabled';
export { ErrorThatHandlesItsOwnResponse, ElasticsearchError, getEsErrorMessage };
