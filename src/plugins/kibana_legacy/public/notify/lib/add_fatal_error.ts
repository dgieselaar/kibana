/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { FatalErrorsSetup } from '../../../../../core/public/fatal_errors/fatal_errors_service';
import type { AngularHttpError } from './format_angular_http_error';
import { formatAngularHttpError, isAngularHttpError } from './format_angular_http_error';

export function addFatalError(
  fatalErrors: FatalErrorsSetup,
  error: AngularHttpError | Error | string,
  location?: string
) {
  // add support for angular http errors to newPlatformFatalErrors
  if (isAngularHttpError(error)) {
    error = formatAngularHttpError(error);
  }

  fatalErrors.add(error, location);
}
