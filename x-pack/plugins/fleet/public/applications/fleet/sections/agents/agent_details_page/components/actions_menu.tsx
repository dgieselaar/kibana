/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiContextMenuItem, EuiPortal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo, useMemo, useState } from 'react';

import { FLEET_SERVER_PACKAGE } from '../../../../../../../common/constants/epm';
import { isAgentUpgradeable } from '../../../../../../../common/services/is_agent_upgradeable';
import type { Agent } from '../../../../../../../common/types/models/agent';
import type { AgentPolicy } from '../../../../../../../common/types/models/agent_policy';
import type { PackagePolicy } from '../../../../../../../common/types/models/package_policy';
import { ContextMenuActions } from '../../../../../../components/context_menu_actions';
import { useCapabilities } from '../../../../../../hooks/use_capabilities';
import { useKibanaVersion } from '../../../../../../hooks/use_kibana_version';
import { AgentReassignAgentPolicyModal } from '../../components/agent_reassign_policy_modal';
import { AgentUnenrollAgentModal } from '../../components/agent_unenroll_modal';
import { AgentUpgradeAgentModal } from '../../components/agent_upgrade_modal';
import { useAgentRefresh } from '../hooks/use_agent';

export const AgentDetailsActionMenu: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
  assignFlyoutOpenByDefault?: boolean;
  onCancelReassign?: () => void;
}> = memo(({ agent, assignFlyoutOpenByDefault = false, onCancelReassign, agentPolicy }) => {
  const hasWriteCapabilites = useCapabilities().write;
  const kibanaVersion = useKibanaVersion();
  const refreshAgent = useAgentRefresh();
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState(assignFlyoutOpenByDefault);
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const isUnenrolling = agent.status === 'unenrolling';

  const hasFleetServer =
    agentPolicy &&
    agentPolicy.package_policies.some(
      (ap: string | PackagePolicy) =>
        typeof ap !== 'string' && ap.package?.name === FLEET_SERVER_PACKAGE
    );

  const onClose = useMemo(() => {
    if (onCancelReassign) {
      return onCancelReassign;
    } else {
      return () => setIsReassignFlyoutOpen(false);
    }
  }, [onCancelReassign, setIsReassignFlyoutOpen]);

  return (
    <>
      {isReassignFlyoutOpen && (
        <EuiPortal>
          <AgentReassignAgentPolicyModal agents={[agent]} onClose={onClose} />
        </EuiPortal>
      )}
      {isUnenrollModalOpen && (
        <EuiPortal>
          <AgentUnenrollAgentModal
            agents={[agent]}
            agentCount={1}
            onClose={() => {
              setIsUnenrollModalOpen(false);
              refreshAgent();
            }}
            useForceUnenroll={isUnenrolling}
            hasFleetServer={hasFleetServer}
          />
        </EuiPortal>
      )}
      {isUpgradeModalOpen && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            agents={[agent]}
            agentCount={1}
            version={kibanaVersion}
            onClose={() => {
              setIsUpgradeModalOpen(false);
              refreshAgent();
            }}
          />
        </EuiPortal>
      )}
      <ContextMenuActions
        button={{
          props: { iconType: 'arrowDown', iconSide: 'right', color: 'primary', fill: true },
          children: (
            <FormattedMessage
              id="xpack.fleet.agentDetails.actionsButton"
              defaultMessage="Actions"
            />
          ),
        }}
        items={[
          <EuiContextMenuItem
            icon="pencil"
            onClick={() => {
              setIsReassignFlyoutOpen(true);
            }}
            disabled={!agent.active}
            key="reassignPolicy"
          >
            <FormattedMessage
              id="xpack.fleet.agentList.reassignActionText"
              defaultMessage="Assign to new policy"
            />
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            icon="cross"
            disabled={!hasWriteCapabilites || !agent.active}
            onClick={() => {
              setIsUnenrollModalOpen(true);
            }}
          >
            {isUnenrolling ? (
              <FormattedMessage
                id="xpack.fleet.agentList.forceUnenrollOneButton"
                defaultMessage="Force unenroll"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.agentList.unenrollOneButton"
                defaultMessage="Unenroll agent"
              />
            )}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            icon="refresh"
            disabled={!isAgentUpgradeable(agent, kibanaVersion)}
            onClick={() => {
              setIsUpgradeModalOpen(true);
            }}
          >
            <FormattedMessage
              id="xpack.fleet.agentList.upgradeOneButton"
              defaultMessage="Upgrade agent"
            />
          </EuiContextMenuItem>,
        ]}
      />
    </>
  );
});
