/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { CoreSetup, KibanaRequest, Plugin, PluginInitializerContext } from 'src/core/server';
import { IEventLogClientService } from '../../event_log/server';
import { MappingsDefinition, ObservabilityAlertRegistry, ObservabilityConfig } from '.';
import { IFieldType, IIndexPattern } from '../../../../src/plugins/data/common';
import { IndexPatternsFetcher } from '../../../../src/plugins/data/server';
import { ESSearchRequest, ESSearchResponse } from '../../../typings/elasticsearch';
import { AlertingPlugin } from '../../alerts/server';
import {
  AnnotationsAPI,
  bootstrapAnnotations,
  ScopedAnnotationsClient,
  ScopedAnnotationsClientFactory,
} from './lib/annotations/bootstrap_annotations';
import { MappingsObject } from './utils/create_or_update_index';
import { unwrapEsResponse } from './utils/unwrap_es_response';

type LazyScopedAnnotationsClientFactory = (
  ...args: Parameters<ScopedAnnotationsClientFactory>
) => Promise<ScopedAnnotationsClient | undefined>;

export interface AlertHistoryClient {
  search<TRequest extends ESSearchRequest>(
    request: TRequest
  ): Promise<ESSearchResponse<unknown, TRequest>>;
  getIndexPattern(): Promise<IIndexPattern>;
  getFields(): string[];
}

export interface ObservabilityPluginSetup {
  getScopedAnnotationsClient: LazyScopedAnnotationsClientFactory;
  getAlertHistoryClient: (request: KibanaRequest) => Promise<AlertHistoryClient>;
  alerts: ObservabilityAlertRegistry;
}

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(
    core: CoreSetup,
    plugins: { alerts: AlertingPlugin['setup'] }
  ): ObservabilityPluginSetup {
    const config = this.initContext.config.get<ObservabilityConfig>();

    let annotationsApiPromise: Promise<AnnotationsAPI> | undefined;

    if (config.annotations.enabled) {
      annotationsApiPromise = bootstrapAnnotations({
        core,
        index: config.annotations.index,
        context: this.initContext,
      }).catch((err) => {
        const logger = this.initContext.logger.get('annotations');
        logger.warn(err);
        throw err;
      });
    }

    const allMappings: MappingsDefinition[] = [];

    const alerts: ObservabilityAlertRegistry = {
      registerType({ mappings, ...alertType }) {
        plugins.alerts.registerType(alertType);
        if (mappings) {
          allMappings.push(mappings);
        }
      },
    };

    function toRuntimeMapping(
      mapping: MappingsDefinition | MappingsObject,
      fieldName: string
    ): Record<string, { type: string; script: { source: string } }> {
      if (!('type' in mapping)) {
        return Object.keys(mapping.properties ?? {}).reduce((prev, key) => {
          const child = mapping.properties[key];

          return {
            ...prev,
            ...toRuntimeMapping(child, fieldName.split('.').filter(Boolean).concat(key).join('.')),
          };
        }, {});
      }

      const conditionalFieldName = fieldName
        .split('.')
        .map((part, index, all) => (index !== all.length - 1 ? `${part}?` : part))
        .join('.');

      switch (mapping.type) {
        case 'keyword':
        case 'long':
        case 'boolean':
        case 'date':
        case 'double':
        case 'ip':
          return {
            [fieldName]: {
              type: mapping.type,
              script: {
                source: `
                  if (params._source.${conditionalFieldName} != null) {
                    emit(params._source.${fieldName});
                  }
                `,
              },
            },
          };
          break;
      }

      throw new Error(`Cannot convert mapping of type ${mapping.type} to runtime mapping`);
    }

    return {
      getAlertHistoryClient: async (request: KibanaRequest) => {
        const [coreStart, pluginsStart] = await core.getStartServices();

        const eventLogClientService = (pluginsStart as any).eventLog as IEventLogClientService;

        // @ts-expect-error
        const index = eventLogClientService.getClient(request).esContext.esNames.indexPattern;

        const runtimeMappings = toRuntimeMapping(merge({}, ...allMappings), '');

        return {
          async search<TSearchRequest extends ESSearchRequest>(
            searchRequestBody: TSearchRequest
          ): Promise<ESSearchResponse<unknown, TSearchRequest>> {
            const response = await unwrapEsResponse(
              coreStart.elasticsearch.client.asInternalUser.search({
                index,
                ...searchRequestBody,
                body: {
                  ...searchRequestBody.body,
                  runtime_mappings: runtimeMappings,
                },
              })
            );

            return response as ESSearchResponse<unknown, TSearchRequest>;
          },
          async getIndexPattern(): Promise<IIndexPattern> {
            const indexPatternsFetcher = new IndexPatternsFetcher(
              coreStart.elasticsearch.client.asInternalUser
            );

            const fields: IFieldType[] = await indexPatternsFetcher.getFieldsForWildcard({
              pattern: index,
            });

            return {
              title: index,
              timeFieldName: '@timestamp',
              fields: fields.concat(
                Object.keys(runtimeMappings).map((key) => {
                  const fieldDescriptor: IFieldType = {
                    name: key,
                    type: runtimeMappings[key].type,
                    scripted: true,
                    script: `return params._source.${key}`,
                  };

                  return fieldDescriptor;
                })
              ),
            };
          },
          getFields(): string[] {
            return Object.keys(runtimeMappings);
          },
        };
      },
      getScopedAnnotationsClient: async (...args) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient(...args);
      },
      alerts,
    };
  }

  public start() {}

  public stop() {}
}
