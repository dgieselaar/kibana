/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpHandler } from '../../../../../../../../src/core/public/http/types';
import { getLogSourceConfigurationPath } from '../../../../../common/http_api/log_sources/common';
import { getLogSourceConfigurationSuccessResponsePayloadRT } from '../../../../../common/http_api/log_sources/get_log_source_configuration';
import { FetchLogSourceConfigurationError } from '../../../../../common/log_sources/errors';
import { decodeOrThrow } from '../../../../../common/runtime_types';

export const callFetchLogSourceConfigurationAPI = async (sourceId: string, fetch: HttpHandler) => {
  const response = await fetch(getLogSourceConfigurationPath(sourceId), {
    method: 'GET',
  }).catch((error) => {
    throw new FetchLogSourceConfigurationError(
      `Failed to fetch log source configuration "${sourceId}": ${error}`,
      error
    );
  });

  return decodeOrThrow(
    getLogSourceConfigurationSuccessResponsePayloadRT,
    (message: string) =>
      new FetchLogSourceConfigurationError(
        `Failed to decode log source configuration "${sourceId}": ${message}`
      )
  )(response);
};
