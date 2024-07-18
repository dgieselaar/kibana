/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiTitle,
  EuiButton,
  EuiMarkdownFormat,
  EuiLoadingSpinner,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGrid,
  EuiCard,
  EuiCodeBlock,
} from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import { i18n } from '@kbn/i18n';
import {
  concatenateTaskUpdateEvents,
  InferenceTaskEventType,
  onlyTaskCompleteEvents,
} from '@kbn/observability-ai-assistant-plugin/public';
import { filter, last, tap } from 'rxjs';
import { InferenceTaskUpdateEvent } from '@kbn/observability-ai-assistant-plugin/public';
import type { ExtractedService } from '../../hooks/use_extracted_services';
import { useDefaultDateRange } from '../../hooks/use_default_date_range';
import { useKibana } from '../../hooks/use_kibana';
import { generateServiceDescription } from '../../tasks/service_analysis/generate_service_description';
import { generateDashboard } from '../../tasks/service_analysis/generate_dashboard';

export function ServicePanel({
  service,
  onReset,
  onDelete,
  onUpdate,
}: {
  service: ExtractedService;
  onReset: () => void;
  onDelete: () => void;
  onUpdate: (service: ExtractedService) => void;
}) {
  const {
    dependencies: {
      start: { observabilityAIAssistant },
    },
    services: { apiClient },
  } = useKibana();

  const [processing, setProcessing] = useState(false);

  const [description, setDescription] = useState(service.description || '');

  const [{ start, end }] = useDefaultDateRange();

  const { value: chatService } = useAbortableAsync(
    ({ signal }) => {
      return observabilityAIAssistant.service.start({
        signal,
      });
    },
    [observabilityAIAssistant]
  );

  const connectorId = useObservable(observabilityAIAssistant.service.lastUsedConnector$);

  return (
    <EuiPanel key={service.name} hasBorder>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiTitle size="s">
            <h3>{service.name}</h3>
          </EuiTitle>
          {processing ? <EuiLoadingSpinner size="s" /> : null}
          <EuiFlexItem grow>
            <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
              <EuiButtonEmpty
                data-test-subj="dataOnboardingServicePanelButtonReset"
                iconType="refresh"
                onClick={() => {
                  onReset();
                  setDescription('');
                }}
              />
              <EuiButtonEmpty
                data-test-subj="dataOnboardingServicePanelButtonDelete"
                iconType="trash"
                onClick={() => {
                  onDelete();
                }}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="row" wrap gutterSize="s" justifyContent="flexStart">
          <EuiButton
            iconType="sparkles"
            color="text"
            data-test-subj="dataOnboardingDataOnboardingServicesViewDescribeServiceButton"
            size="s"
            disabled={processing}
            onClick={() => {
              if (chatService && connectorId) {
                const signal = new AbortController().signal;
                setProcessing(true);
                generateServiceDescription({
                  start,
                  end,
                  apiClient,
                  inference: chatService,
                  name: service.name,
                  signal,
                  sources: service.sources,
                  connectorId,
                })
                  .pipe(
                    filter(
                      (event): event is InferenceTaskUpdateEvent =>
                        event.type === InferenceTaskEventType.Update
                    ),
                    concatenateTaskUpdateEvents(),
                    tap(({ content }) => {
                      setDescription(content);
                    }),
                    last(),
                    tap(({ content }) => {
                      onUpdate({ ...service, description: content });
                    })
                  )
                  .subscribe({
                    complete: () => {
                      setProcessing(false);
                    },
                    error: () => {
                      setProcessing(false);
                    },
                  });
              }
            }}
          >
            {i18n.translate(
              'xpack.dataOnboarding.dataOnboardingServicesView.describeServiceButtonLabel',
              { defaultMessage: 'Describe service' }
            )}
          </EuiButton>
          <EuiButton
            iconType="sparkles"
            color="text"
            data-test-subj="dataOnboardingDataOnboardingServicesViewFindDependenciesButton"
            size="s"
            disabled={processing}
          >
            {i18n.translate(
              'xpack.dataOnboarding.dataOnboardingServicesView.findDependenciesButtonLabel',
              { defaultMessage: 'Find dependencies' }
            )}
          </EuiButton>
          <EuiButton
            iconType="sparkles"
            color="text"
            data-test-subj="dataOnboardingDataOnboardingServicesViewGenerateDashboardButton"
            size="s"
            disabled={processing}
            onClick={() => {
              if (chatService && connectorId) {
                const signal = new AbortController().signal;
                setProcessing(true);
                generateDashboard({
                  start,
                  end,
                  apiClient,
                  inference: chatService,
                  name: service.name,
                  signal,
                  sources: service.sources,
                  connectorId,
                  description,
                })
                  .pipe(
                    onlyTaskCompleteEvents(),
                    tap((taskCompleteEvent) => {
                      onUpdate({
                        ...service,
                        visualizations: taskCompleteEvent.output.visualizations,
                      });
                    })
                  )

                  .subscribe({
                    complete: () => {
                      setProcessing(false);
                    },
                    error: () => {
                      setProcessing(false);
                    },
                  });
              }
            }}
          >
            {i18n.translate(
              'xpack.dataOnboarding.dataOnboardingServicesView.generateDashboardButtonLabel',
              { defaultMessage: 'Generate dashboard' }
            )}
          </EuiButton>
        </EuiFlexGroup>
        {description ? <EuiMarkdownFormat>{description}</EuiMarkdownFormat> : null}
        {service.visualizations?.length ? (
          <EuiFlexGrid columns={3}>
            {service.visualizations.map((vis) => {
              return (
                <EuiCard key={vis.title} title={vis.title} description={vis.description}>
                  <EuiCodeBlock>{vis.esql}</EuiCodeBlock>
                </EuiCard>
              );
            })}
          </EuiFlexGrid>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
