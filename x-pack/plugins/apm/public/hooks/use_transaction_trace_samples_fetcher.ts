/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../context/url_params_context/use_url_params';
import { useFetcher } from './use_fetcher';

export interface TraceSample {
  traceId: string;
  transactionId: string;
}

const INITIAL_DATA = {
  noHits: true,
  traceSamples: [] as TraceSample[],
};

export function useTransactionTraceSamplesFetcher({
  transactionName,
  kuery,
  environment,
}: {
  transactionName: string;
  kuery: string;
  environment: string;
}) {
  const { serviceName, transactionType } = useApmServiceContext();

  const {
    urlParams: {
      start,
      end,
      transactionId,
      traceId,
      sampleRangeFrom,
      sampleRangeTo,
    },
  } = useUrlParams();

  const { data = INITIAL_DATA, status, error } = useFetcher(
    async (callApmApi) => {
      if (serviceName && start && end && transactionType && transactionName) {
        const response = await callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transactions/traces/samples',
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              transactionName,
              transactionId,
              traceId,
              sampleRangeFrom,
              sampleRangeTo,
            },
          },
        });

        if (response.noHits) {
          return response;
        }

        const { traceSamples } = response;

        return {
          noHits: false,
          traceSamples,
        };
      }
    },
    // the samples should not be refetched if the transactionId or traceId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      sampleRangeFrom,
      sampleRangeTo,
    ]
  );

  return {
    traceSamplesData: data,
    traceSamplesStatus: status,
    traceSamplesError: error,
  };
}
