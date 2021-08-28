/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '../../../../../src/core/server/elasticsearch/client/types';
import type { KibanaRequest } from '../../../../../src/core/server/http/router/request';
import type { SavedObjectsClientContract } from '../../../../../src/core/server/saved_objects/types';
import type { Agent, AgentStatus } from '../../common/types/models/agent';
import type { GetAgentStatusResponse } from '../../common/types/rest_spec/agent';

import type { getAgentById, getAgentsByKuery } from './agents/crud';
import type { agentPolicyService } from './agent_policy';
import type { getInstallation } from './epm/packages/get';
import * as settingsService from './settings';

// Saved object services
export { agentPolicyService } from './agent_policy';
// Plugin services
export { appContextService } from './app_context';
// Artifacts services
export * from './artifacts';
export { getRegistryUrl } from './epm/registry/registry_url';
export { ESIndexPatternSavedObjectService } from './es_index_pattern';
export { licenseService } from './license';
export { outputService } from './output';
export { packagePolicyService } from './package_policy';
// Policy preconfiguration functions
export { ensurePreconfiguredPackagesAndPolicies } from './preconfiguration';
export { settingsService };

/**
 * Service to return the index pattern of EPM packages
 */
export interface ESIndexPatternService {
  getESIndexPattern(
    savedObjectsClient: SavedObjectsClientContract,
    pkgName: string,
    datasetPath: string
  ): Promise<string | undefined>;
}

/**
 * Service that provides exported function that return information about EPM packages
 */

export interface PackageService {
  getInstallation: typeof getInstallation;
}

/**
 * A service that provides exported functions that return information about an Agent
 */
export interface AgentService {
  /**
   * Get an Agent by id
   */
  getAgent: typeof getAgentById;
  /**
   * Authenticate an agent with access toekn
   */
  authenticateAgentWithAccessToken(
    esClient: ElasticsearchClient,
    request: KibanaRequest
  ): Promise<Agent>;
  /**
   * Return the status by the Agent's id
   */
  getAgentStatusById(esClient: ElasticsearchClient, agentId: string): Promise<AgentStatus>;
  /**
   * Return the status by the Agent's Policy id
   */
  getAgentStatusForAgentPolicy(
    esClient: ElasticsearchClient,
    agentPolicyId?: string,
    filterKuery?: string
  ): Promise<GetAgentStatusResponse['results']>;
  /**
   * List agents
   */
  listAgents: typeof getAgentsByKuery;
}

export interface AgentPolicyServiceInterface {
  get: typeof agentPolicyService['get'];
  list: typeof agentPolicyService['list'];
  getDefaultAgentPolicyId: typeof agentPolicyService['getDefaultAgentPolicyId'];
  getFullAgentPolicy: typeof agentPolicyService['getFullAgentPolicy'];
  getByIds: typeof agentPolicyService['getByIDs'];
}
