/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from 'src/core/server';
import { MappingsDefinition } from '.';
import type {
  AlertingPlugin,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
  AlertType,
} from '../../alerts/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';

/**
 * @internal
 */
export interface ObservabilityRequestHandlerContext extends RequestHandlerContext {
  licensing: LicensingApiRequestHandlerContext;
}

/**
 * @internal
 */
export type ObservabilityPluginRouter = IRouter<ObservabilityRequestHandlerContext>;

export interface ObservabilityAlertRegistry {
  registerType<
    Params extends AlertTypeParams = AlertTypeParams,
    State extends AlertTypeState = AlertTypeState,
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext,
    ActionGroupIds extends string = never,
    RecoveryActionGroupId extends string = never
  >(
    alertType: AlertType<
      Params,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    > & { mappings?: MappingsDefinition }
  ): void;
}
