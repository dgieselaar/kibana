/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Type } from '@kbn/config-schema';
import type { CapabilitiesSetup, CapabilitiesStart } from './capabilities/capabilities_service';
import type { ContextSetup } from './context/context_service';
import type {
  ConfigUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
  CoreUsageData,
  CoreUsageStats,
} from './core_usage_data/types';
import type {
  DeprecationsClient,
} from './deprecations/deprecations_service';
import type { IScopedClusterClient } from './elasticsearch/client/scoped_cluster_client';
import { configSchema as elasticsearchConfigSchema } from './elasticsearch/elasticsearch_config';
import type {
  ElasticsearchServicePreboot,
} from './elasticsearch/types';
import type {
  ExecutionContextSetup,
  ExecutionContextStart,
} from './execution_context/execution_context_service';
import type { HttpServicePreboot } from './http/types';
import type { HttpResources } from './http_resources/types';
import type { AppenderConfigType } from './logging/appenders/appenders';
import { appendersSchema } from './logging/appenders/appenders';
import type { PluginsServiceSetup, PluginsServiceStart } from './plugins/plugins_service';
import type { PluginOpaqueId } from './plugins/types';
import type { PrebootServicePreboot } from './preboot/types';
import type { ISavedObjectsExporter } from './saved_objects/export/saved_objects_exporter';
import type { ISavedObjectsImporter } from './saved_objects/import/saved_objects_importer';
import type { ISavedObjectTypeRegistry } from './saved_objects/saved_objects_type_registry';
import type { SavedObjectsClientProviderOptions } from './saved_objects/service/lib/scoped_client_provider';
import type { SavedObjectsClientContract } from './saved_objects/types';
import type {
  IUiSettingsClient,
} from './ui_settings/types';

// Because of #79265 we need to explicitly import, then export these types for
// scripts/telemetry_check.js to work as expected
export type { AppCategory } from '../types';
export { APP_WRAPPER_CLASS, DEFAULT_APP_CATEGORIES } from '../utils';
export { bootstrap } from './bootstrap';
export type {
  Capabilities,
  CapabilitiesProvider,
  CapabilitiesSwitcher,
  ResolveCapabilitiesOptions,
} from './capabilities';
export type {
  AddConfigDeprecation,
  ConfigDeprecation,
  ConfigDeprecationFactory,
  ConfigDeprecationProvider,
  ConfigPath,
  ConfigService,
  EnvironmentMode,
  PackageInfo,
} from './config';
export type {
  HandlerContextType,
  HandlerFunction,
  HandlerParameters,
  IContextContainer,
  IContextProvider,
} from './context';
export type { CoreId } from './core_context';
export type { CoreUsageDataStart } from './core_usage_data';
export { CspConfig } from './csp';
export type { ICspConfig } from './csp';
export type {
  DeprecationsClient,
  DeprecationsDetails,
  DeprecationsServiceSetup,
  GetDeprecationsContext,
  RegisterDeprecationsConfig,
} from './deprecations';
export { ElasticsearchConfig } from './elasticsearch';
export type {
  CountResponse,
  DeleteDocumentResponse,
  ElasticsearchClient,
  ElasticsearchClientConfig,
  ElasticsearchConfigPreboot,
  ElasticsearchServicePreboot,
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  ElasticsearchStatusMeta,
  FakeRequest,
  GetResponse,
  IClusterClient,
  ICustomClusterClient,
  IScopedClusterClient,
  NodesVersionCompatibility,
  ScopeableRequest,
  SearchResponse,
  ShardsInfo,
  ShardsResponse,
} from './elasticsearch';
export type { IExecutionContextContainer, KibanaExecutionContext } from './execution_context';
export type { IExternalUrlConfig, IExternalUrlPolicy } from './external_url';
export { KibanaRequest, kibanaResponseFactory, validBodyOutput } from './http';
export type {
  Authenticated,
  AuthenticationHandler,
  AuthHeaders,
  AuthNotHandled,
  AuthRedirected,
  AuthRedirectedParams,
  AuthResult,
  AuthResultParams,
  AuthResultType,
  AuthStatus,
  AuthToolkit,
  BasePath,
  CustomHttpResponseOptions,
  DestructiveRouteMethod,
  ErrorHttpResponseOptions,
  GetAuthHeaders,
  GetAuthState,
  Headers,
  HttpAuth,
  HttpResponseOptions,
  HttpResponsePayload,
  HttpServerInfo,
  HttpServicePreboot,
  HttpServiceSetup,
  HttpServiceStart,
  IBasePath,
  IKibanaResponse,
  IKibanaSocket,
  IRouter,
  IsAuthenticated,
  KibanaRequestEvents,
  KibanaRequestRoute,
  KibanaRequestRouteOptions,
  KibanaResponseFactory,
  KnownHeaders,
  LifecycleResponseFactory,
  OnPostAuthHandler,
  OnPostAuthToolkit,
  OnPreAuthHandler,
  OnPreAuthToolkit,
  OnPreResponseExtensions,
  OnPreResponseHandler,
  OnPreResponseInfo,
  OnPreResponseRender,
  OnPreResponseToolkit,
  OnPreRoutingHandler,
  OnPreRoutingToolkit,
  RedirectResponseOptions,
  RequestHandler,
  RequestHandlerContextContainer,
  RequestHandlerContextProvider,
  RequestHandlerWrapper,
  ResponseError,
  ResponseErrorAttributes,
  ResponseHeaders,
  RouteConfig,
  RouteConfigOptions,
  RouteConfigOptionsBody,
  RouteContentType,
  RouteMethod,
  RouteRegistrar,
  RouteValidationError,
  RouteValidationFunction,
  RouteValidationResultFactory,
  RouteValidationSpec,
  RouteValidatorConfig,
  RouteValidatorFullConfig,
  RouteValidatorOptions,
  SafeRouteMethod,
  SessionCookieValidationResult,
  SessionStorage,
  SessionStorageCookieOptions,
  SessionStorageFactory,
} from './http';
export type {
  HttpResourcesRenderOptions,
  HttpResourcesRequestHandler,
  HttpResourcesResponseOptions,
  HttpResourcesServiceToolkit,
} from './http_resources';
export type { I18nServiceSetup } from './i18n';
export type {
  AppenderConfigType,
  Ecs,
  EcsEventCategory,
  EcsEventKind,
  EcsEventOutcome,
  EcsEventType,
  Logger,
  LoggerConfigType,
  LoggerContextConfigInput,
  LoggerFactory,
  LoggingServiceSetup,
  LogLevel,
  LogMeta,
  LogRecord,
} from './logging';
export type {
  MetricsServiceSetup,
  MetricsServiceStart,
  OpsMetrics,
  OpsOsMetrics,
  OpsProcessMetrics,
  OpsServerMetrics,
} from './metrics';
export { PluginType } from './plugins';
export type {
  AsyncPlugin,
  DiscoveredPlugin,
  MakeUsageFromSchema,
  Plugin,
  PluginConfigDescriptor,
  PluginConfigSchema,
  PluginInitializer,
  PluginInitializerContext,
  PluginManifest,
  PluginName,
  PrebootPlugin,
  SharedGlobalConfig,
} from './plugins';
export type { PrebootServicePreboot } from './preboot';
export type { IRenderOptions } from './rendering';
export {
  SavedObjectsClient,
  SavedObjectsErrorHelpers,
  SavedObjectsSerializer,
  SavedObjectsUtils,
  SavedObjectTypeRegistry,
} from './saved_objects';
export type {
  ISavedObjectsExporter,
  ISavedObjectsImporter,
  ISavedObjectsPointInTimeFinder,
  ISavedObjectsRepository,
  ISavedObjectTypeRegistry,
  SavedObjectExportBaseOptions,
  SavedObjectMigrationContext,
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
  SavedObjectReferenceWithContext,
  SavedObjectSanitizedDoc,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsClientFactory,
  SavedObjectsClientFactoryProvider,
  SavedObjectsClientProviderOptions,
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsClosePointInTimeResponse,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsCreateOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportByTypeOptions,
  SavedObjectsExporter,
  SavedObjectsExportError,
  SavedObjectsExportExcludedObject,
  SavedObjectsExportResultDetails,
  SavedObjectsExportTransform,
  SavedObjectsExportTransformContext,
  SavedObjectsFieldMapping,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsImportActionRequiredWarning,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportConflictError,
  SavedObjectsImporter,
  SavedObjectsImportError,
  SavedObjectsImportFailure,
  SavedObjectsImportHook,
  SavedObjectsImportHookResult,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportOptions,
  SavedObjectsImportResponse,
  SavedObjectsImportRetry,
  SavedObjectsImportSimpleWarning,
  SavedObjectsImportSuccess,
  SavedObjectsImportUnknownError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportWarning,
  SavedObjectsIncrementCounterField,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsMappingProperties,
  SavedObjectsMigrationLogger,
  SavedObjectsNamespaceType,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsOpenPointInTimeResponse,
  SavedObjectsRawDoc,
  SavedObjectsRawDocParseOptions,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsRemoveReferencesToResponse,
  SavedObjectsRepository,
  SavedObjectsRepositoryFactory,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectsResolveResponse,
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
  SavedObjectStatusMeta,
  SavedObjectsType,
  SavedObjectsTypeManagementDefinition,
  SavedObjectsTypeMappingDefinition,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateObjectsSpacesResponseObject,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
  SavedObjectUnsanitizedDoc,
} from './saved_objects';
export { ServiceStatusLevels } from './status';
export type { CoreStatus, ServiceStatus, ServiceStatusLevel, StatusServiceSetup } from './status';
export type {
  MutatingOperationRefreshSetting,
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectReference,
  SavedObjectsBaseOptions,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsMigrationVersion,
  SavedObjectsPitParams,
} from './types';
export type {
  DeprecationSettings,
  IUiSettingsClient,
  PublicUiSettingsParams,
  UiSettingsParams,
  UiSettingsServiceSetup,
  UiSettingsServiceStart,
  UiSettingsType,
  UserProvidedValues,
} from './ui_settings';
export type {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
  ConfigUsageData,
};
export type {
  CapabilitiesSetup,
  CapabilitiesStart,
  ContextSetup,
  ExecutionContextSetup,
  ExecutionContextStart,
  HttpResources,
  PluginsServiceSetup,
  PluginsServiceStart,
  PluginOpaqueId,
};

export type {
  CoreStart,
  CoreSetup
} from './plugin_contract';

/**
 * Plugin specific context passed to a route handler.
 *
 * Provides the following clients and services:
 *    - {@link SavedObjectsClient | savedObjects.client} - Saved Objects client
 *      which uses the credentials of the incoming request
 *    - {@link ISavedObjectTypeRegistry | savedObjects.typeRegistry} - Type registry containing
 *      all the registered types.
 *    - {@link IScopedClusterClient | elasticsearch.client} - Elasticsearch
 *      data client which uses the credentials of the incoming request
 *    - {@link IUiSettingsClient | uiSettings.client} - uiSettings client
 *      which uses the credentials of the incoming request
 *
 * @public
 */
export interface RequestHandlerContext {
  core: {
    savedObjects: {
      client: SavedObjectsClientContract;
      typeRegistry: ISavedObjectTypeRegistry;
      getClient: (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
      getExporter: (client: SavedObjectsClientContract) => ISavedObjectsExporter;
      getImporter: (client: SavedObjectsClientContract) => ISavedObjectsImporter;
    };
    elasticsearch: {
      client: IScopedClusterClient;
    };
    uiSettings: {
      client: IUiSettingsClient;
    };
    deprecations: {
      client: DeprecationsClient;
    };
  };
}

/**
 * Context passed to the `setup` method of `preboot` plugins.
 * @public
 */
export interface CorePreboot {
  /** {@link ElasticsearchServicePreboot} */
  elasticsearch: ElasticsearchServicePreboot;
  /** {@link HttpServicePreboot} */
  http: HttpServicePreboot;
  /** {@link PrebootServicePreboot} */
  preboot: PrebootServicePreboot;
}

/**
 * Config schemas for the platform services.
 *
 * @alpha
 */
export const config = {
  elasticsearch: {
    schema: elasticsearchConfigSchema,
  },
  logging: {
    appenders: appendersSchema as Type<AppenderConfigType>,
  },
};
