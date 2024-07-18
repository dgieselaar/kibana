/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  CreateProposal,
  ServiceCandidateAnalysis,
  ServiceCandidateAnalysisStatus,
} from '../../tasks/extract_services/analyze_service_candidates';

function AnalysisDisplay({
  analysis,
  onCreateServiceClick,
}: {
  analysis: ServiceCandidateAnalysis;
  onCreateServiceClick: (proposal: CreateProposal) => void;
}) {
  if (analysis.status === ServiceCandidateAnalysisStatus.Queued) {
    return (
      <EuiText size="s">
        {i18n.translate('xpack.dataOnboarding.analysisDisplay.queuedLabel', {
          defaultMessage: 'Queued',
        })}
      </EuiText>
    );
  }

  if (analysis.status === ServiceCandidateAnalysisStatus.Loading) {
    return (
      <EuiFlexGroup direction="row" alignItems="center" justifyContent="flexStart">
        <EuiLoadingSpinner size="s" />
        <EuiText size="s">
          {i18n.translate(
            'xpack.dataOnboarding.analysisDisplay.identifyingPossibleServiceTextLabel',
            { defaultMessage: 'Identifying possible service' }
          )}
        </EuiText>
      </EuiFlexGroup>
    );
  }

  const outcome = analysis.outcome;

  if (
    analysis.status === ServiceCandidateAnalysisStatus.Resolved &&
    outcome?.proposal.type === 'create'
  ) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.dataOnboarding.analysisDisplay.datasetsTitleLabel', {
                defaultMessage: 'Datasets',
              })}
            </h3>
          </EuiTitle>
          <EuiHorizontalRule margin="none" />
          {outcome.proposal.sources.map((source) => {
            return (
              <EuiFlexGroup direction="row" alignItems="center" gutterSize="s" key={source.dataset}>
                <EuiText size="xs">{source.dataset}</EuiText>
                {source.filter ? <EuiBadge>{source.filter}</EuiBadge> : null}
              </EuiFlexGroup>
            );
          })}
        </EuiFlexGroup>

        <EuiHorizontalRule margin="none" />

        <EuiButton
          size="s"
          iconType="plusInCircleFilled"
          color="success"
          data-test-subj="dataOnboardingAnalysisDisplayCreateServiceButton"
          onClick={() => {
            onCreateServiceClick(outcome.proposal as CreateProposal);
          }}
        >
          {i18n.translate('xpack.dataOnboarding.analysisDisplay.createServiceLabel', {
            defaultMessage: 'Create service',
          })}
        </EuiButton>
      </EuiFlexGroup>
    );
  }

  if (
    analysis.status === ServiceCandidateAnalysisStatus.Resolved &&
    analysis.outcome?.proposal.type === 'discard' &&
    'reason' in analysis.outcome.proposal
  ) {
    return <EuiText size="s">{analysis.outcome.proposal.reason}</EuiText>;
  }

  return null;
}

export function ServiceCandidate({
  name,
  terms,
  analysis,
  onCreateServiceClick,
}: {
  name: string;
  terms: Array<{ field: string; value: string }>;
  analysis?: ServiceCandidateAnalysis;
  onCreateServiceClick: (proposal: CreateProposal) => void;
}) {
  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiTitle size="s">
          <h2>{name}</h2>
        </EuiTitle>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexGroup direction="row" gutterSize="s">
            {terms
              .map((term) => [term.field, term.value].join(':'))
              .map((term) => (
                <EuiBadge key={term}>{term}</EuiBadge>
              ))}
          </EuiFlexGroup>
        </EuiFlexGroup>
        {analysis ? (
          <AnalysisDisplay
            analysis={analysis}
            onCreateServiceClick={(proposal) => {
              onCreateServiceClick(proposal);
            }}
          />
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
