/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreKibanaRequest,
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { firstValueFrom } from 'rxjs';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import { EntityManagerConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import { builtInDefinitions } from './lib/entities/built_in';
import { upgradeBuiltInEntityDefinitions } from './lib/entities/upgrade_entity_definition';
import { EntityClient } from './lib/entity_client';
import { installEntityManagerTemplates } from './lib/manage_index_templates';
import { entityManagerRouteRepository } from './routes';
import { EntityManagerRouteDependencies } from './routes/types';
import {
  EntityDiscoveryApiKeyType,
  apiEntityApiDefinition,
  entityDefinition,
} from './saved_objects';
import {
  EntityManagerPluginSetupDependencies,
  EntityManagerPluginStartDependencies,
  EntityManagerServer,
} from './types';
import { EntityMergeTask } from './lib/entities/tasks/entity_merge_task';
import { readEntityDiscoveryAPIKey } from './lib/auth';
import { EntityElasticsearchApiTask } from './lib/entities/tasks/entity_elasticsearch_api_task';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityManagerServerPluginSetup {}
export interface EntityManagerServerPluginStart {
  getScopedClient: (options: { request: KibanaRequest }) => Promise<EntityClient>;
  getFakeRequestForBackgroundUser: () => Promise<CoreKibanaRequest | undefined>;
}

export const config: PluginConfigDescriptor<EntityManagerConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class EntityManagerServerPlugin
  implements
    Plugin<
      EntityManagerServerPluginSetup,
      EntityManagerServerPluginStart,
      EntityManagerPluginSetupDependencies,
      EntityManagerPluginStartDependencies
    >
{
  public config: EntityManagerConfig;
  public logger: Logger;
  public server?: EntityManagerServer;

  constructor(context: PluginInitializerContext<EntityManagerConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: EntityManagerPluginSetupDependencies
  ): EntityManagerServerPluginSetup {
    core.savedObjects.registerType(apiEntityApiDefinition);
    core.savedObjects.registerType(entityDefinition);
    core.savedObjects.registerType(EntityDiscoveryApiKeyType);

    plugins.encryptedSavedObjects.registerType({
      type: EntityDiscoveryApiKeyType.name,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['id', 'name']),
    });

    this.server = {
      config: this.config,
      logger: this.logger,
    } as EntityManagerServer;

    const entityMergeTask = new EntityMergeTask(plugins.taskManager, this.server);
    const entityElasticsearchApiTask = new EntityElasticsearchApiTask(
      plugins.taskManager,
      this.server
    );

    registerRoutes<EntityManagerRouteDependencies>({
      repository: entityManagerRouteRepository,
      dependencies: {
        server: this.server,
        tasks: {
          entityMergeTask,
          entityElasticsearchApiTask,
        },
        getScopedEntityClient: async ({ request }: { request: KibanaRequest }) => {
          const [coreStart] = await core.getStartServices();
          return this.getScopedClient({ request, coreStart });
        },
        getScopedClients: async ({ request }: { request: KibanaRequest }) => {
          const [coreStart] = await core.getStartServices();
          const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
          const soClient = coreStart.savedObjects.getScopedClient(request);
          return { scopedClusterClient, soClient };
        },
      },
      core,
      logger: this.logger,
    });

    return {};
  }

  private async getScopedClient({
    request,
    coreStart,
  }: {
    request: KibanaRequest;
    coreStart: CoreStart;
  }) {
    const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
    const soClient = coreStart.savedObjects.getScopedClient(request);
    return new EntityClient({ esClient, soClient, logger: this.logger });
  }

  public start(
    core: CoreStart,
    plugins: EntityManagerPluginStartDependencies
  ): EntityManagerServerPluginStart {
    if (this.server) {
      this.server.core = core;
      this.server.isServerless = core.elasticsearch.getCapabilities().serverless;
      this.server.security = plugins.security;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
      this.server.taskManager = plugins.taskManager;
    }

    const esClient = core.elasticsearch.client.asInternalUser;

    installEntityManagerTemplates({ esClient, logger: this.logger })
      .then(async () => {
        // the api key validation requires a check against the cluster license
        // which is lazily loaded. we ensure it gets loaded before the update
        await firstValueFrom(plugins.licensing.license$);
        const { success } = await upgradeBuiltInEntityDefinitions({
          definitions: builtInDefinitions,
          server: this.server!,
        });

        if (success) {
          this.logger.info('Builtin definitions were successfully upgraded');
        }
      })
      .catch((err) => this.logger.error(err));

    return {
      getScopedClient: async ({ request }: { request: KibanaRequest }) => {
        return this.getScopedClient({ request, coreStart: core });
      },
      getFakeRequestForBackgroundUser: async () => {
        const apiKey = await readEntityDiscoveryAPIKey(this.server!);
        return apiKey
          ? getFakeKibanaRequest({
              id: apiKey.id,
              api_key: apiKey.apiKey,
            })
          : undefined;
      },
    };
  }

  public stop() {}
}
