/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { isUndefined, omitBy } from 'lodash';
import type { IScopedClusterClient } from '../../../../src/core/server/elasticsearch/client/scoped_cluster_client';
import { KibanaRequest } from '../../../../src/core/server/http/router/request';
import { SavedObjectsUtils } from '../../../../src/core/server/saved_objects/service/lib/utils';
import type { SavedObjectsClientContract } from '../../../../src/core/server/saved_objects/types';
import type { SavedObject, SavedObjectAttributes } from '../../../../src/core/types/saved_objects';
import type { AuditLogger } from '../../security/server/audit/audit_service';
import type { RunNowResult } from '../../task_manager/server/task_scheduling';
import type { ActionType, ActionTypeExecutorResult } from '../common/types';
import { ActionTypeRegistry } from './action_type_registry';
import { ActionsAuthorization } from './authorization/actions_authorization';
import {
  AuthorizationMode,
  getAuthorizationModeBySource,
} from './authorization/get_authorization_mode_by_source';
import type {
  ExecuteOptions as EnqueueExecutionOptions,
  ExecutionEnqueuer,
} from './create_execute_function';
import type { ActionExecutorContract, ExecuteOptions } from './lib/action_executor';
import { ConnectorAuditAction, connectorAuditEvent } from './lib/audit_events';
import { PreconfiguredActionDisabledModificationError } from './lib/errors/preconfigured_action_disabled_modification';
import { validateConfig, validateSecrets } from './lib/validate_with_schema';
import type { ActionResult, FindActionResult, PreConfiguredAction, RawAction } from './types';

// We are assuming there won't be many actions. This is why we will load
// all the actions in advance and assume the total count to not go over 10000.
// We'll set this max setting assuming it's never reached.
export const MAX_ACTIONS_RETURNED = 10000;

interface ActionUpdate extends SavedObjectAttributes {
  name: string;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
}

interface Action extends ActionUpdate {
  actionTypeId: string;
}

export interface CreateOptions {
  action: Action;
}

interface ConstructorOptions {
  defaultKibanaIndex: string;
  scopedClusterClient: IScopedClusterClient;
  actionTypeRegistry: ActionTypeRegistry;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  preconfiguredActions: PreConfiguredAction[];
  actionExecutor: ActionExecutorContract;
  executionEnqueuer: ExecutionEnqueuer<void>;
  ephemeralExecutionEnqueuer: ExecutionEnqueuer<RunNowResult>;
  request: KibanaRequest;
  authorization: ActionsAuthorization;
  auditLogger?: AuditLogger;
}

export interface UpdateOptions {
  id: string;
  action: ActionUpdate;
}

export class ActionsClient {
  private readonly defaultKibanaIndex: string;
  private readonly scopedClusterClient: IScopedClusterClient;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly actionTypeRegistry: ActionTypeRegistry;
  private readonly preconfiguredActions: PreConfiguredAction[];
  private readonly actionExecutor: ActionExecutorContract;
  private readonly request: KibanaRequest;
  private readonly authorization: ActionsAuthorization;
  private readonly executionEnqueuer: ExecutionEnqueuer<void>;
  private readonly ephemeralExecutionEnqueuer: ExecutionEnqueuer<RunNowResult>;
  private readonly auditLogger?: AuditLogger;

  constructor({
    actionTypeRegistry,
    defaultKibanaIndex,
    scopedClusterClient,
    unsecuredSavedObjectsClient,
    preconfiguredActions,
    actionExecutor,
    executionEnqueuer,
    ephemeralExecutionEnqueuer,
    request,
    authorization,
    auditLogger,
  }: ConstructorOptions) {
    this.actionTypeRegistry = actionTypeRegistry;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.scopedClusterClient = scopedClusterClient;
    this.defaultKibanaIndex = defaultKibanaIndex;
    this.preconfiguredActions = preconfiguredActions;
    this.actionExecutor = actionExecutor;
    this.executionEnqueuer = executionEnqueuer;
    this.ephemeralExecutionEnqueuer = ephemeralExecutionEnqueuer;
    this.request = request;
    this.authorization = authorization;
    this.auditLogger = auditLogger;
  }

  /**
   * Create an action
   */
  public async create({
    action: { actionTypeId, name, config, secrets },
  }: CreateOptions): Promise<ActionResult> {
    const id = SavedObjectsUtils.generateId();

    try {
      await this.authorization.ensureAuthorized('create', actionTypeId);
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.CREATE,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }

    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const validatedActionTypeConfig = validateConfig(actionType, config);
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets);

    this.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.CREATE,
        savedObject: { type: 'action', id },
        outcome: 'unknown',
      })
    );

    const result = await this.unsecuredSavedObjectsClient.create(
      'action',
      {
        actionTypeId,
        name,
        isMissingSecrets: false,
        config: validatedActionTypeConfig as SavedObjectAttributes,
        secrets: validatedActionTypeSecrets as SavedObjectAttributes,
      },
      { id }
    );

    return {
      id: result.id,
      actionTypeId: result.attributes.actionTypeId,
      isMissingSecrets: result.attributes.isMissingSecrets,
      name: result.attributes.name,
      config: result.attributes.config,
      isPreconfigured: false,
    };
  }

  /**
   * Update action
   */
  public async update({ id, action }: UpdateOptions): Promise<ActionResult> {
    try {
      await this.authorization.ensureAuthorized('update');

      if (
        this.preconfiguredActions.find((preconfiguredAction) => preconfiguredAction.id === id) !==
        undefined
      ) {
        throw new PreconfiguredActionDisabledModificationError(
          i18n.translate('xpack.actions.serverSideErrors.predefinedActionUpdateDisabled', {
            defaultMessage: 'Preconfigured action {id} is not allowed to update.',
            values: {
              id,
            },
          }),
          'update'
        );
      }
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.UPDATE,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }
    const {
      attributes,
      references,
      version,
    } = await this.unsecuredSavedObjectsClient.get<RawAction>('action', id);
    const { actionTypeId } = attributes;
    const { name, config, secrets } = action;
    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const validatedActionTypeConfig = validateConfig(actionType, config);
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets);

    this.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.UPDATE,
        savedObject: { type: 'action', id },
        outcome: 'unknown',
      })
    );

    const result = await this.unsecuredSavedObjectsClient.create<RawAction>(
      'action',
      {
        ...attributes,
        actionTypeId,
        name,
        isMissingSecrets: false,
        config: validatedActionTypeConfig as SavedObjectAttributes,
        secrets: validatedActionTypeSecrets as SavedObjectAttributes,
      },
      omitBy(
        {
          id,
          overwrite: true,
          references,
          version,
        },
        isUndefined
      )
    );

    return {
      id,
      actionTypeId: result.attributes.actionTypeId as string,
      isMissingSecrets: result.attributes.isMissingSecrets as boolean,
      name: result.attributes.name as string,
      config: result.attributes.config as Record<string, unknown>,
      isPreconfigured: false,
    };
  }

  /**
   * Get an action
   */
  public async get({ id }: { id: string }): Promise<ActionResult> {
    try {
      await this.authorization.ensureAuthorized('get');
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.GET,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }

    const preconfiguredActionsList = this.preconfiguredActions.find(
      (preconfiguredAction) => preconfiguredAction.id === id
    );
    if (preconfiguredActionsList !== undefined) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.GET,
          savedObject: { type: 'action', id },
        })
      );

      return {
        id,
        actionTypeId: preconfiguredActionsList.actionTypeId,
        name: preconfiguredActionsList.name,
        isPreconfigured: true,
      };
    }

    const result = await this.unsecuredSavedObjectsClient.get<RawAction>('action', id);

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET,
        savedObject: { type: 'action', id },
      })
    );

    return {
      id,
      actionTypeId: result.attributes.actionTypeId,
      isMissingSecrets: result.attributes.isMissingSecrets,
      name: result.attributes.name,
      config: result.attributes.config,
      isPreconfigured: false,
    };
  }

  /**
   * Get all actions with preconfigured list
   */
  public async getAll(): Promise<FindActionResult[]> {
    try {
      await this.authorization.ensureAuthorized('get');
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.FIND,
          error,
        })
      );
      throw error;
    }

    const savedObjectsActions = (
      await this.unsecuredSavedObjectsClient.find<RawAction>({
        perPage: MAX_ACTIONS_RETURNED,
        type: 'action',
      })
    ).saved_objects.map(actionFromSavedObject);

    savedObjectsActions.forEach(({ id }) =>
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.FIND,
          savedObject: { type: 'action', id },
        })
      )
    );

    const mergedResult = [
      ...savedObjectsActions,
      ...this.preconfiguredActions.map((preconfiguredAction) => ({
        id: preconfiguredAction.id,
        actionTypeId: preconfiguredAction.actionTypeId,
        name: preconfiguredAction.name,
        isPreconfigured: true,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
    return await injectExtraFindData(
      this.defaultKibanaIndex,
      this.scopedClusterClient,
      mergedResult
    );
  }

  /**
   * Get bulk actions with preconfigured list
   */
  public async getBulk(ids: string[]): Promise<ActionResult[]> {
    try {
      await this.authorization.ensureAuthorized('get');
    } catch (error) {
      ids.forEach((id) =>
        this.auditLogger?.log(
          connectorAuditEvent({
            action: ConnectorAuditAction.GET,
            savedObject: { type: 'action', id },
            error,
          })
        )
      );
      throw error;
    }

    const actionResults = new Array<ActionResult>();
    for (const actionId of ids) {
      const action = this.preconfiguredActions.find(
        (preconfiguredAction) => preconfiguredAction.id === actionId
      );
      if (action !== undefined) {
        actionResults.push(action);
      }
    }

    // Fetch action objects in bulk
    // Excluding preconfigured actions to avoid an not found error, which is already added
    const actionSavedObjectsIds = [
      ...new Set(
        ids.filter(
          (actionId) => !actionResults.find((actionResult) => actionResult.id === actionId)
        )
      ),
    ];

    const bulkGetOpts = actionSavedObjectsIds.map((id) => ({ id, type: 'action' }));
    const bulkGetResult = await this.unsecuredSavedObjectsClient.bulkGet<RawAction>(bulkGetOpts);

    bulkGetResult.saved_objects.forEach(({ id, error }) => {
      if (!error && this.auditLogger) {
        this.auditLogger.log(
          connectorAuditEvent({
            action: ConnectorAuditAction.GET,
            savedObject: { type: 'action', id },
          })
        );
      }
    });

    for (const action of bulkGetResult.saved_objects) {
      if (action.error) {
        throw Boom.badRequest(
          `Failed to load action ${action.id} (${action.error.statusCode}): ${action.error.message}`
        );
      }
      actionResults.push(actionFromSavedObject(action));
    }
    return actionResults;
  }

  /**
   * Delete action
   */
  public async delete({ id }: { id: string }) {
    try {
      await this.authorization.ensureAuthorized('delete');

      if (
        this.preconfiguredActions.find((preconfiguredAction) => preconfiguredAction.id === id) !==
        undefined
      ) {
        throw new PreconfiguredActionDisabledModificationError(
          i18n.translate('xpack.actions.serverSideErrors.predefinedActionDeleteDisabled', {
            defaultMessage: 'Preconfigured action {id} is not allowed to delete.',
            values: {
              id,
            },
          }),
          'delete'
        );
      }
    } catch (error) {
      this.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.DELETE,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.DELETE,
        outcome: 'unknown',
        savedObject: { type: 'action', id },
      })
    );

    return await this.unsecuredSavedObjectsClient.delete('action', id);
  }

  public async execute({
    actionId,
    params,
    source,
    relatedSavedObjects,
  }: Omit<ExecuteOptions, 'request'>): Promise<ActionTypeExecutorResult<unknown>> {
    if (
      (await getAuthorizationModeBySource(this.unsecuredSavedObjectsClient, source)) ===
      AuthorizationMode.RBAC
    ) {
      await this.authorization.ensureAuthorized('execute');
    }
    return this.actionExecutor.execute({
      actionId,
      params,
      source,
      request: this.request,
      relatedSavedObjects,
    });
  }

  public async enqueueExecution(options: EnqueueExecutionOptions): Promise<void> {
    const { source } = options;
    if (
      (await getAuthorizationModeBySource(this.unsecuredSavedObjectsClient, source)) ===
      AuthorizationMode.RBAC
    ) {
      await this.authorization.ensureAuthorized('execute');
    }
    return this.executionEnqueuer(this.unsecuredSavedObjectsClient, options);
  }

  public async ephemeralEnqueuedExecution(options: EnqueueExecutionOptions): Promise<RunNowResult> {
    const { source } = options;
    if (
      (await getAuthorizationModeBySource(this.unsecuredSavedObjectsClient, source)) ===
      AuthorizationMode.RBAC
    ) {
      await this.authorization.ensureAuthorized('execute');
    }
    return this.ephemeralExecutionEnqueuer(this.unsecuredSavedObjectsClient, options);
  }

  public async listTypes(): Promise<ActionType[]> {
    return this.actionTypeRegistry.list();
  }

  public isActionTypeEnabled(
    actionTypeId: string,
    options: { notifyUsage: boolean } = { notifyUsage: false }
  ) {
    return this.actionTypeRegistry.isActionTypeEnabled(actionTypeId, options);
  }
}

function actionFromSavedObject(savedObject: SavedObject<RawAction>): ActionResult {
  return {
    id: savedObject.id,
    ...savedObject.attributes,
    isPreconfigured: false,
  };
}

async function injectExtraFindData(
  defaultKibanaIndex: string,
  scopedClusterClient: IScopedClusterClient,
  actionResults: ActionResult[]
): Promise<FindActionResult[]> {
  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};
  for (const actionResult of actionResults) {
    aggs[actionResult.id] = {
      filter: {
        bool: {
          must: {
            nested: {
              path: 'references',
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            'references.id': actionResult.id,
                          },
                        },
                        {
                          term: {
                            'references.type': 'action',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
  const { body: aggregationResult } = await scopedClusterClient.asInternalUser.search({
    index: defaultKibanaIndex,
    body: {
      aggs,
      size: 0,
      query: {
        match_all: {},
      },
    },
  });
  return actionResults.map((actionResult) => ({
    ...actionResult,
    // @ts-expect-error aggegation type is not specified
    referencedByCount: aggregationResult.aggregations[actionResult.id].doc_count,
  }));
}
