/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import type { IClusterClient } from '../../../../src/core/server/elasticsearch/client/cluster_client';
import { KibanaRequest } from '../../../../src/core/server/http/router/request';
import type { SpacesServiceStart } from '../../spaces/server/spaces_service/spaces_service';
import type { EsContext } from './es/context';
import { EventLogClient } from './event_log_client';
import { SavedObjectProviderRegistry } from './saved_object_provider_registry';
import type { IEventLogClientService } from './types';

export type PluginClusterClient = Pick<IClusterClient, 'asInternalUser'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;

interface EventLogServiceCtorParams {
  esContext: EsContext;
  savedObjectProviderRegistry: SavedObjectProviderRegistry;
  spacesService?: SpacesServiceStart;
}

// note that clusterClient may be null, indicating we can't write to ES
export class EventLogClientService implements IEventLogClientService {
  private esContext: EsContext;
  private savedObjectProviderRegistry: SavedObjectProviderRegistry;
  private spacesService?: SpacesServiceStart;

  constructor({
    esContext,
    savedObjectProviderRegistry,
    spacesService,
  }: EventLogServiceCtorParams) {
    this.esContext = esContext;
    this.savedObjectProviderRegistry = savedObjectProviderRegistry;
    this.spacesService = spacesService;
  }

  getClient(request: KibanaRequest) {
    return new EventLogClient({
      esContext: this.esContext,
      savedObjectGetter: this.savedObjectProviderRegistry.getProvidersClient(request),
      spacesService: this.spacesService,
      request,
    });
  }
}
