/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import semver from 'semver';

import type { AgentPolicy } from '../../../common/types/models/agent_policy';
import { useKibanaVersion } from '../../hooks/use_kibana_version';

import { AdvancedAgentAuthenticationSettings } from './advanced_agent_authentication_settings';
import { EnrollmentStepAgentPolicy } from './agent_policy_selection';

export const DownloadStep = () => {
  const kibanaVersion = useKibanaVersion();
  const kibanaVersionURLString = useMemo(
    () =>
      `${semver.major(kibanaVersion)}-${semver.minor(kibanaVersion)}-${semver.patch(
        kibanaVersion
      )}`,
    [kibanaVersion]
  );
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepDownloadAgentTitle', {
      defaultMessage: 'Download the Elastic Agent to your host',
    }),
    children: (
      <>
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.downloadDescription"
            defaultMessage="Fleet Server runs on an Elastic Agent. You can download the Elastic Agent binaries and verification signatures from Elastic’s download page."
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.downloadUseLinuxInstaller"
            defaultMessage="Linux users: We recommend using the installers over (RPM/DEB) because they provide the ability to upgrade your agent within Fleet."
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiButton
          href={`https://www.elastic.co/downloads/past-releases/elastic-agent-${kibanaVersionURLString}`}
          target="_blank"
          iconSide="right"
          iconType="popout"
        >
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.downloadLink"
            defaultMessage="Go to download page"
          />
        </EuiButton>
      </>
    ),
  };
};

export const AgentPolicySelectionStep = ({
  agentPolicies,
  setSelectedPolicyId,
  selectedApiKeyId,
  setSelectedAPIKeyId,
  excludeFleetServer,
}: {
  agentPolicies?: AgentPolicy[];
  setSelectedPolicyId?: (policyId?: string) => void;
  selectedApiKeyId?: string;
  setSelectedAPIKeyId?: (key?: string) => void;
  excludeFleetServer?: boolean;
}) => {
  const regularAgentPolicies = useMemo(() => {
    return Array.isArray(agentPolicies)
      ? agentPolicies.filter(
          (policy) =>
            policy && !policy.is_managed && (!excludeFleetServer || !policy.is_default_fleet_server)
        )
      : [];
  }, [agentPolicies, excludeFleetServer]);

  const onAgentPolicyChange = useCallback(
    async (policyId?: string) => {
      if (setSelectedPolicyId) {
        setSelectedPolicyId(policyId);
      }
    },
    [setSelectedPolicyId]
  );

  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepChooseAgentPolicyTitle', {
      defaultMessage: 'Choose an agent policy',
    }),
    children: (
      <EnrollmentStepAgentPolicy
        agentPolicies={regularAgentPolicies}
        withKeySelection={setSelectedAPIKeyId ? true : false}
        selectedApiKeyId={selectedApiKeyId}
        onKeyChange={setSelectedAPIKeyId}
        onAgentPolicyChange={onAgentPolicyChange}
        excludeFleetServer={excludeFleetServer}
      />
    ),
  };
};

export const AgentEnrollmentKeySelectionStep = ({
  agentPolicy,
  selectedApiKeyId,
  setSelectedAPIKeyId,
}: {
  agentPolicy: AgentPolicy;
  selectedApiKeyId?: string;
  setSelectedAPIKeyId: (key?: string) => void;
}) => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepConfigurePolicyAuthenticationTitle', {
      defaultMessage: 'Select enrollment token',
    }),
    children: (
      <>
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.agentAuthenticationSettings"
            defaultMessage="{agentPolicyName} has been selected. Select which enrollment token to use when enrolling agents."
            values={{
              agentPolicyName: <strong>{agentPolicy.name}</strong>,
            }}
          />
        </EuiText>
        <EuiSpacer size="l" />
        <AdvancedAgentAuthenticationSettings
          agentPolicyId={agentPolicy.id}
          selectedApiKeyId={selectedApiKeyId}
          initialAuthenticationSettingsOpen
          onKeyChange={setSelectedAPIKeyId}
        />
      </>
    ),
  };
};
