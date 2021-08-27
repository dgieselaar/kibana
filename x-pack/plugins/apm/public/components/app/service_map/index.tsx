/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import type { Environment } from '../../../../common/environment_rt';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import {
  invalidLicenseMessage,
  SERVICE_MAP_TIMEOUT_ERROR,
} from '../../../../common/service_map';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useServiceName } from '../../../hooks/use_service_name';
import { useTheme } from '../../../hooks/use_theme';
import { LicensePrompt } from '../../shared/license_prompt';
import { SearchBar } from '../../shared/search_bar';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { getCytoscapeDivStyle } from './cytoscape_options';
import { EmptyBanner } from './EmptyBanner';
import { EmptyPrompt } from './empty_prompt';
import { Popover } from './Popover';
import { TimeoutPrompt } from './timeout_prompt';
import { useRefDimensions } from './useRefDimensions';

function PromptContainer({ children }: { children: ReactNode }) {
  return (
    <>
      <SearchBar showKueryBar={false} />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceAround"
        // Set the height to give it some top margin
        style={{ height: '60vh' }}
      >
        <EuiFlexItem
          grow={false}
          style={{ width: 600, textAlign: 'center' as const }}
        >
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function LoadingSpinner() {
  return (
    <EuiLoadingSpinner
      size="xl"
      style={{ position: 'absolute', top: '50%', left: '50%' }}
    />
  );
}

export function ServiceMapHome() {
  const {
    query: { environment, kuery },
  } = useApmParams('/service-map');
  return <ServiceMap environment={environment} kuery={kuery} />;
}

export function ServiceMapServiceDetail() {
  const {
    query: { environment, kuery },
  } = useApmParams('/services/:serviceName/service-map');
  return <ServiceMap environment={environment} kuery={kuery} />;
}

export function ServiceMap({
  environment,
  kuery,
}: {
  environment: Environment;
  kuery: string;
}) {
  const theme = useTheme();
  const license = useLicenseContext();

  const { urlParams } = useUrlParams();

  const serviceName = useServiceName();

  const { data = { elements: [] }, status, error } = useFetcher(
    (callApmApi) => {
      // When we don't have a license or a valid license, don't make the request.
      if (!license || !isActivePlatinumLicense(license)) {
        return;
      }

      const { start, end } = urlParams;
      if (start && end) {
        return callApmApi({
          isCachable: false,
          endpoint: 'GET /api/apm/service-map',
          params: {
            query: {
              start,
              end,
              environment,
              serviceName,
            },
          },
        });
      }
    },
    [license, serviceName, environment, urlParams]
  );

  const { ref, height } = useRefDimensions();

  // Temporary hack to work around bottom padding introduced by EuiPage
  const PADDING_BOTTOM = 24;
  const heightWithPadding = height - PADDING_BOTTOM;

  if (!license) {
    return null;
  }

  if (!isActivePlatinumLicense(license)) {
    return (
      <PromptContainer>
        <LicensePrompt text={invalidLicenseMessage} />
      </PromptContainer>
    );
  }

  if (status === FETCH_STATUS.SUCCESS && data.elements.length === 0) {
    return (
      <PromptContainer>
        <EmptyPrompt />
      </PromptContainer>
    );
  }

  if (
    status === FETCH_STATUS.FAILURE &&
    error &&
    'body' in error &&
    error.body.statusCode === 500 &&
    error.body.message === SERVICE_MAP_TIMEOUT_ERROR
  ) {
    return (
      <PromptContainer>
        <TimeoutPrompt isGlobalServiceMap={!serviceName} />
      </PromptContainer>
    );
  }

  return (
    <>
      <SearchBar showKueryBar={false} />
      <EuiPanel hasBorder={true} paddingSize="none">
        <div
          data-test-subj="ServiceMap"
          style={{ height: heightWithPadding }}
          ref={ref}
        >
          <Cytoscape
            elements={data.elements}
            height={heightWithPadding}
            serviceName={serviceName}
            style={getCytoscapeDivStyle(theme, status)}
          >
            <Controls />
            {serviceName && <EmptyBanner />}
            {status === FETCH_STATUS.LOADING && <LoadingSpinner />}
            <Popover
              focusedServiceName={serviceName}
              environment={environment}
              kuery={kuery}
            />
          </Cytoscape>
        </div>
      </EuiPanel>
    </>
  );
}
