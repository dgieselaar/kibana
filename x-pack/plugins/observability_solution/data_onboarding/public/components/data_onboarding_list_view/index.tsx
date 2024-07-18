/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { onlyTaskCompleteEvents } from '@kbn/observability-ai-assistant-plugin/public';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { switchMap, tap } from 'rxjs';
import { v4 } from 'uuid';
import { useDefaultDateRange } from '../../hooks/use_default_date_range';
import { useExtractedServices } from '../../hooks/use_extracted_services';
import { useKibana } from '../../hooks/use_kibana';
import {
  analyzeServiceCandidates,
  ServiceCandidateAnalysis,
} from '../../tasks/extract_services/analyze_service_candidates';
import { identifyServiceCandidates } from '../../tasks/extract_services/identify_service_candidate';
import { createDatasetMatcher } from './create_dataset_matcher';
import { ServiceCandidate } from './service_candidate';

export function DataOnboardingListView() {
  const {
    dependencies: {
      start: { observabilityAIAssistant },
    },
    core: { notifications },
    services: { apiClient },
  } = useKibana();

  const { value: chatService } = useAbortableAsync(
    ({ signal }) => {
      return observabilityAIAssistant.service.start({
        signal,
      });
    },
    [observabilityAIAssistant]
  );

  const { value } = useAbortableAsync(
    ({ signal }) => {
      return apiClient('GET /internal/data_onboarding/datasets', {
        signal,
      }).then((response) => {
        const allByName = new Map<
          string,
          typeof response['dataStreams' | 'aliases' | 'indices'][number]
        >();

        [...response.aliases, ...response.dataStreams, ...response.indices].forEach((item) => {
          allByName.set(item.name, item);
        });

        return {
          ...response,
          allByName,
        };
      });
    },
    [apiClient]
  );

  const allOptions = useMemo(() => {
    if (!value) {
      return [];
    }

    const allNames = Array.from(value.allByName.keys());

    return allNames.map((name) => ({
      label: name,
    }));
  }, [value]);

  const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string }>>([]);

  const [searchQuery, setSearchQuery] = useState('');

  const displayedOptions = useMemo(() => {
    const matcher = createDatasetMatcher(searchQuery);
    if (!searchQuery) {
      return allOptions;
    }
    return allOptions.filter((option) => {
      const isMatch = matcher.match(option.label);
      return isMatch;
    });
  }, [allOptions, searchQuery]);

  const matchedSets = useMemo(() => {
    if (!value || !selectedOptions.length) {
      return [];
    }

    const matchers = selectedOptions.map((option) => createDatasetMatcher(option.label));

    return Array.from(value.allByName.values()).filter((dataset) => {
      return matchers.some((matcher) => matcher.match(dataset.name));
    });
  }, [value, selectedOptions]);

  const connectorId = useObservable(observabilityAIAssistant.service.lastUsedConnector$);

  const [{ start, end }] = useDefaultDateRange();

  const [serviceCandidates, setServiceCandidates] = useState<
    Array<{
      name: string;
      terms: Array<{ field: string; value: string }>;
      analysis?: ServiceCandidateAnalysis;
    }>
  >([]);

  const [processing, setProcessing] = useState(false);

  const [extractedServices, setExtractedServices] = useExtractedServices();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        alignItems="stretch"
        justifyContent="flexStart"
      >
        <EuiComboBox
          fullWidth
          selectedOptions={selectedOptions}
          onChange={(nextOptions) => {
            setSelectedOptions(() => nextOptions);
          }}
          onSearchChange={(nextSearchQuery) => {
            setSearchQuery(nextSearchQuery);
          }}
          onCreateOption={(createdOption) => {
            setSelectedOptions((prevOptions) => prevOptions.concat({ label: createdOption }));
          }}
          optionMatcher={() => true}
          options={displayedOptions}
          placeholder={i18n.translate(
            'xpack.dataOnboarding.dataOnboardingListView.selectDatasetsToOnboardComboBoxLabel',
            { defaultMessage: 'Select datasets to onboard' }
          )}
        />

        <EuiFlexGroup direction="row" justifyContent="flexEnd" alignItems="center">
          {matchedSets.length ? (
            <EuiFlexItem grow>
              <EuiText size="xs">
                {i18n.translate(
                  'xpack.dataOnboarding.dataOnboardingListView.foundDatasetsMatchingTextLabel',
                  {
                    defaultMessage: 'Found {matchedCount} dataset(s) matching patterns',
                    values: {
                      matchedCount: matchedSets.length,
                    },
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          ) : null}
          <EuiButtonEmpty
            data-test-subj="dataOnboardingDataOnboardingListViewSuggestPatternsButton"
            iconType="sparkles"
            className={css`
              align-self: flex-start;
            `}
            size="xs"
          >
            {i18n.translate(
              'xpack.dataOnboarding.dataOnboardingListView.suggestPatternButtonLabel',
              {
                defaultMessage: 'Suggest pattern for onboarding new datasets',
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      {matchedSets.length ? (
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiButton
            iconType="sparkles"
            color="text"
            data-test-subj="dataOnboardingDataOnboardingListViewExtractServicesButton"
            isLoading={processing}
            disabled={processing}
            onClick={() => {
              if (chatService && connectorId) {
                setProcessing(true);

                const indexPatterns = matchedSets.map((set) => set.name);

                const signal = new AbortController().signal;

                identifyServiceCandidates({
                  inference: chatService,
                  apiClient,
                  connectorId,
                  signal,
                  start,
                  end,
                  indexPatterns: selectedOptions.map((selectedOption) => selectedOption.label),
                })
                  .pipe(
                    onlyTaskCompleteEvents(),
                    tap((task) => {
                      setServiceCandidates(task.output.candidates);
                    }),
                    switchMap((task) => {
                      return analyzeServiceCandidates({
                        apiClient,
                        candidates: task.output.candidates,
                        connectorId,
                        start,
                        end,
                        datasets: indexPatterns,
                        inference: chatService,
                        signal,
                      });
                    }),
                    tap((analysis) => {
                      setServiceCandidates((prevServiceCandidates) => {
                        return prevServiceCandidates.map((candidate) => {
                          if (analysis.name === candidate.name) {
                            return {
                              ...candidate,
                              analysis,
                            };
                          }
                          return candidate;
                        });
                      });
                    })
                  )
                  .subscribe({
                    error: (err) => {
                      setProcessing(false);
                    },
                    next: (task) => {},
                    complete: () => {
                      setProcessing(false);
                    },
                  });
              }
            }}
          >
            {i18n.translate(
              'xpack.dataOnboarding.dataOnboardingListView.extractServicesButtonLabel',
              { defaultMessage: 'Extract services' }
            )}
          </EuiButton>
        </EuiFlexGroup>
      ) : null}
      {serviceCandidates.length ? (
        <EuiFlexGroup direction="column">
          {serviceCandidates.map((candidate) => {
            return (
              <ServiceCandidate
                key={candidate.name}
                name={candidate.name}
                terms={candidate.terms}
                analysis={candidate.analysis}
                onCreateServiceClick={(proposal) => {
                  setExtractedServices((prevCreatedServices) => {
                    return prevCreatedServices.concat({
                      id: v4(),
                      name: candidate.name,
                      sources: proposal.sources,
                    });
                  });

                  setServiceCandidates((prevCandidates) => {
                    return prevCandidates.filter(
                      (candidateAtIndex) => candidateAtIndex.name !== candidate.name
                    );
                  });

                  notifications.toasts.addSuccess(
                    i18n.translate(
                      'xpack.dataOnboarding.dataOnboardingListView.serviceNameExtractedLabel',
                      {
                        defaultMessage: 'Service {name} extracted',
                        values: { name: candidate.name },
                      }
                    )
                  );
                }}
              />
            );
          })}
        </EuiFlexGroup>
      ) : null}
    </EuiFlexGroup>
  );
}
