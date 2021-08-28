/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo } from 'react';
import styled from 'styled-components';

import { fullAgentPolicyToYaml } from '../../../../../../common/services/full_agent_policy_to_yaml';
import { agentPolicyRouteService } from '../../../../../../common/services/routes';
import { Loading } from '../../../../../components/loading';
import { useStartServices } from '../../../../../hooks/use_core';
import {
  useGetOneAgentPolicy,
  useGetOneAgentPolicyFull,
} from '../../../../../hooks/use_request/agent_policy';

const FlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;

export const AgentPolicyYamlFlyout = memo<{ policyId: string; onClose: () => void }>(
  ({ policyId, onClose }) => {
    const core = useStartServices();
    const { isLoading: isLoadingYaml, data: yamlData, error } = useGetOneAgentPolicyFull(policyId);
    const { data: agentPolicyData } = useGetOneAgentPolicy(policyId);
    const body = isLoadingYaml ? (
      <Loading />
    ) : error ? (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.fleet.policyDetails.ErrorGettingFullAgentPolicy"
            defaultMessage="Error loading agent policy"
          />
        }
        color="danger"
        iconType="alert"
      >
        {error.message}
      </EuiCallOut>
    ) : (
      <EuiCodeBlock language="yaml" isCopyable fontSize="m" whiteSpace="pre">
        {fullAgentPolicyToYaml(yamlData!.item)}
      </EuiCodeBlock>
    );

    const downloadLink = core.http.basePath.prepend(
      agentPolicyRouteService.getInfoFullDownloadPath(policyId)
    );

    return (
      <EuiFlyout onClose={onClose} size="l" maxWidth={640}>
        <EuiFlyoutHeader hasBorder aria-labelledby="IngestManagerAgentPolicyYamlFlyoutTitle">
          <EuiTitle size="m">
            <h2 id="IngestManagerAgentPolicyYamlFlyoutTitle">
              {agentPolicyData?.item ? (
                <FormattedMessage
                  id="xpack.fleet.policyDetails.yamlflyoutTitleWithName"
                  defaultMessage="'{name}' agent policy"
                  values={{ name: agentPolicyData.item.name }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.policyDetails.yamlflyoutTitleWithoutName"
                  defaultMessage="Agent policy"
                />
              )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <FlyoutBody>{body}</FlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.fleet.policyDetails.yamlFlyoutCloseButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                href={downloadLink}
                iconType="download"
                isDisabled={Boolean(isLoadingYaml && !yamlData)}
              >
                <FormattedMessage
                  id="xpack.fleet.policyDetails.yamlDownloadButtonLabel"
                  defaultMessage="Download policy"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
