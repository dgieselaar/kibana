/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum RouteName {
  HOME = 'home',
  SERVICES = 'services',
  SERVICE_MAP = 'service-map',
  SINGLE_SERVICE_MAP = 'single-service-map',
  TRACES = 'traces',
  SERVICE = 'service',
  TRANSACTIONS = 'transactions',
  ERRORS = 'errors',
  ERROR = 'error',
  METRICS = 'metrics',
  SERVICE_NODE_METRICS = 'node_metrics',
  TRANSACTION_TYPE = 'transaction_type',
  TRANSACTION_NAME = 'transaction_name',
  SETTINGS = 'settings',
  AGENT_CONFIGURATION = 'agent_configuration',
  AGENT_CONFIGURATION_CREATE = 'agent_configuration_create',
  AGENT_CONFIGURATION_EDIT = 'agent_configuration_edit',
  INDICES = 'indices',
  SERVICE_NODES = 'nodes',
  LINK_TO_TRACE = 'link_to_trace',
  LINK_TO_TRANSACTION_GROUP = 'link_to_transaction_group',
  CUSTOMIZE_UI = 'customize_ui',
  RUM_OVERVIEW = 'rum_overview',
}
