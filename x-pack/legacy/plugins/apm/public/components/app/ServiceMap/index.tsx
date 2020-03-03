/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useMemo } from 'react';
import { isValidPlatinumLicense } from '../../../../../../../plugins/apm/common/service_map';
import { useDeepObjectIdentity } from '../../../hooks/useDeepObjectIdentity';
import { useLicense } from '../../../hooks/useLicense';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { getCytoscapeElements } from './get_cytoscape_elements';
import { PlatinumLicensePrompt } from './PlatinumLicensePrompt';
import { Popover } from './Popover';
import { useRefHeight } from './useRefHeight';
import { useFetcher } from '../../../hooks/useFetcher';

interface ServiceMapProps {
  serviceName?: string;
}

const cytoscapeDivStyle = {
  background: `linear-gradient(
  90deg,
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
linear-gradient(
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
${theme.euiColorLightShade}`,
  backgroundSize: `${theme.euiSizeL} ${theme.euiSizeL}`,
  margin: `-${theme.gutterTypes.gutterLarge}`,
  marginTop: 0
};

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const license = useLicense();
  const { search } = useLocation();
  const { urlParams, uiFilters } = useUrlParams();
  const params = useDeepObjectIdentity({
    start: urlParams.start,
    end: urlParams.end,
    environment: urlParams.environment,
    serviceName,
    uiFilters: {
      ...uiFilters,
      environment: undefined
    }
  });

  const { data } = useFetcher(
    callApmApi => {
      const { start, end } = params;
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/service-map',
          params: {
            query: {
              ...params,
              start,
              end,
              uiFilters: JSON.stringify(params.uiFilters)
            }
          }
        });
      }
    },
    [params]
  );

  const elements = useMemo(() => {
    return data ? getCytoscapeElements(data, search) : [];
  }, [data, search]);

  const [wrapperRef, height] = useRefHeight();

  if (!license) {
    return null;
  }

  return isValidPlatinumLicense(license) ? (
    <div
      style={{ height: height - parseInt(theme.gutterTypes.gutterLarge, 10) }}
      ref={wrapperRef}
    >
      <Cytoscape
        elements={elements}
        serviceName={serviceName}
        height={height}
        style={cytoscapeDivStyle}
      >
        <Controls />
        <Popover focusedServiceName={serviceName} />
      </Cytoscape>
    </div>
  ) : (
    <PlatinumLicensePrompt />
  );
}
