/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useExtractedServices } from '../../hooks/use_extracted_services';
import { ServicePanel } from './service_panel';

export function DataOnboardingServicesView() {
  const [extractedServices, setExtractedServices] = useExtractedServices();

  if (!extractedServices.length) {
    return (
      <EuiText size="s">
        {i18n.translate(
          'xpack.dataOnboarding.dataOnboardingServicesView.noServicesExtractedLabel',
          { defaultMessage: 'No services extracted' }
        )}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButtonEmpty
            data-test-subj="dataOnboardingDataOnboardingServicesViewButton"
            iconType="cross"
            iconSide="right"
            onClick={() => {
              setExtractedServices([]);
            }}
          >
            {i18n.translate(
              'xpack.dataOnboarding.dataOnboardingServicesView.clearAllServicesButtonEmptyLabel',
              { defaultMessage: 'Clear all services' }
            )}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexItem>
      {extractedServices.map((service) => (
        <ServicePanel
          service={service}
          key={service.id}
          onUpdate={(next) => {
            setExtractedServices((prevServices) => {
              return prevServices.map((prevService) => {
                if (service.name === prevService.name) {
                  return {
                    ...prevService,
                    ...next,
                  };
                }
                return prevService;
              });
            });
          }}
          onReset={() => {
            setExtractedServices((prevServices) => {
              return prevServices.map((prevService) => {
                if (service.id === prevService.id) {
                  return {
                    ...prevService,
                    description: '',
                    visualizations: [],
                  };
                }
                return prevService;
              });
            });
          }}
          onDelete={() => {
            setExtractedServices((prevServices) => {
              return prevServices.filter((prevService) => prevService.id !== service.id);
            });
          }}
        />
      ))}
    </EuiFlexGroup>
  );
}
