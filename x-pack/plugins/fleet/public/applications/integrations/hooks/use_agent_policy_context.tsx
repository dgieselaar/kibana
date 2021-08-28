/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FunctionComponent } from 'react';
import React, { createContext, useCallback, useContext, useRef } from 'react';

import { useIntraAppState } from '../../../hooks/use_intra_app_state';
import type { IntegrationsAppBrowseRouteState } from '../../../types/intra_app_route_state';

interface AgentPolicyContextValue {
  getId(): string | undefined;
}

const AgentPolicyContext = createContext<AgentPolicyContextValue>({ getId: () => undefined });

export const AgentPolicyContextProvider: FunctionComponent = ({ children }) => {
  const maybeState = useIntraAppState<undefined | IntegrationsAppBrowseRouteState>();
  const ref = useRef<undefined | string>(maybeState?.forAgentPolicyId);

  const getId = useCallback(() => {
    return ref.current;
  }, []);
  return <AgentPolicyContext.Provider value={{ getId }}>{children}</AgentPolicyContext.Provider>;
};

export const useAgentPolicyContext = () => {
  const ctx = useContext(AgentPolicyContext);
  if (!ctx) {
    throw new Error('useAgentPolicyContext can only be used inside of AgentPolicyContextProvider');
  }
  return ctx;
};
