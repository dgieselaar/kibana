/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  onlyTaskCompleteEvents,
  RunInferenceAPI,
} from '@kbn/observability-ai-assistant-plugin/public';
import { lastValueFrom, Observable } from 'rxjs';
import { DataOnboardingAPIClient } from '../../api';
import { EXTRACT_SERVICES_SYSTEM_MESSAGE } from './system_message';

export interface CreateProposal {
  type: 'create';
  sources: Array<{
    dataset: string;
    filter?: string;
  }>;
}

interface DiscardProposal {
  type: 'discard';
  reason: string;
}

interface ServiceCandidateAnalysisOutcome {
  proposal: CreateProposal | DiscardProposal;
}

export enum ServiceCandidateAnalysisStatus {
  Queued = 'queued',
  Loading = 'loading',
  Resolved = 'resolved',
  Rejected = 'rejected',
}

export interface ServiceCandidateAnalysis {
  name: string;
  status: ServiceCandidateAnalysisStatus;
  outcome?: ServiceCandidateAnalysisOutcome;
}

export function analyzeServiceCandidates({
  inference,
  signal,
  connectorId,
  datasets,
  start,
  end,
  candidates,
  apiClient,
}: {
  inference: RunInferenceAPI;
  signal: AbortSignal;
  connectorId: string;
  datasets: string[];
  start: number;
  end: number;
  candidates: Array<{ name: string; terms: Array<{ field: string; value: string }> }>;
  apiClient: DataOnboardingAPIClient;
}): Observable<ServiceCandidateAnalysis> {
  return new Observable<ServiceCandidateAnalysis>((subscriber) => {
    candidates.forEach((currentCandidate) => {
      subscriber.next({
        name: currentCandidate.name,
        status: ServiceCandidateAnalysisStatus.Queued,
      });
    });
    const processing = candidates.reduce<Promise<ServiceCandidateAnalysisOutcome[]>>(
      async (prev, currentCandidate) => {
        const prevResults = await prev;

        subscriber.next({
          name: currentCandidate.name,
          status: ServiceCandidateAnalysisStatus.Loading,
        });

        const dataAnalysis = await apiClient(
          'POST /internal/data_onboarding/tasks/analyze_service_candidate',
          {
            signal,
            params: {
              body: {
                terms: currentCandidate.terms,
                datasets,
                start,
                end,
              },
            },
          }
        );

        const taskResult = await lastValueFrom(
          inference
            .task('analyze_service_candidate', {
              system: EXTRACT_SERVICES_SYSTEM_MESSAGE,
              connectorId,
              signal,
              input: `
            Your next task is to dive deeper into a proposed service candidate.
            
            The end goal is to come up with a proposal for what to do with the
            service candidate: either create it, with a set of dataset and
            optionally a filter per dataset, or to discard it.

            For each dataset, we have analyzed the distribution of terms. An
            availability of \`all\` means that that field/value pair is present in
            100% of the data, an availability of \`some\` means that it is present
            in some of the data, and an availability of \`none\` means that there
            is no data available for that term at all.

            For each term in a dataset, a distribution tree is created, which
            means that the documents matching that term, are also filtered on other
            terms for the candidate. For a nested distribution, availability refers
            to the amount of documents that that term is available for in that
            _subset_ of the data.
            
            If availability for a top-level term is not \`all\`, it needs a filter.
            
            If your conclusion is that you have discovered a service, return a
            "create" proposal, with the datasets that contain data for the service.

            Discard a candidate when:
            - there is no data for the service at all.

            Propose to create a candidate when:
            - there is at least some data in at least one dataset

            This is the data set analysis:

            ${JSON.stringify(dataAnalysis)}
            
          `,
              schema: {
                type: 'object',
                properties: {
                  proposal: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          type: {
                            type: 'string',
                            const: 'create',
                          },
                          sources: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                dataset: {
                                  type: 'string',
                                },
                                filter: {
                                  type: 'string',
                                  description:
                                    'If the dataset needs to be filtered down to include only data for this service, define a kqlFilter',
                                },
                              },
                              required: ['dataset'],
                            },
                          },
                        },
                        required: ['type', 'sources'],
                      },
                      {
                        type: 'object',
                        properties: {
                          type: {
                            type: 'string',
                            const: 'discard',
                          },
                          reason: {
                            type: 'string',
                            description: 'The reason why you are discarding this proposal',
                          },
                        },
                        required: ['type', 'reason'],
                      },
                    ],
                  },
                },
                required: ['proposal'],
              } as const,
            })
            .pipe(onlyTaskCompleteEvents())
        );

        const outcome: ServiceCandidateAnalysisOutcome = {
          proposal: taskResult.output.proposal,
        };

        subscriber.next({
          name: currentCandidate.name,
          status: ServiceCandidateAnalysisStatus.Resolved,
          outcome: {
            proposal: taskResult.output.proposal,
          },
        });

        return prevResults.concat(outcome);
      },
      Promise.resolve([])
    );

    processing.then(
      () => {
        subscriber.complete();
      },
      (error) => {
        subscriber.error(error);
      }
    );
  });
}
