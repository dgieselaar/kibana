/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { pick } from 'lodash';
import type { ElasticsearchClient } from '../../../../../core/server/elasticsearch/client/types';
import type { SavedObjectsClientContract } from '../../../../../core/server/saved_objects/types';
import type { UiSettingsServiceStart } from '../../../../../core/server/ui_settings/types';
import type { ExpressionsServiceSetup } from '../../../../expressions/common/service/expressions_services';
import type { FieldFormatsStart } from '../../../../field_formats/server/types';
import { calculateBounds } from '../../../common/query/timefilter/get_time';
import type { TimeRange } from '../../../common/query/timefilter/types';
import {
  AggsCommonService,
  aggsRequiredUiSettings,
} from '../../../common/search/aggs/aggs_service';
import { AggConfigs } from '../../../common/search/aggs/agg_configs';
import type { AggTypesDependencies } from '../../../common/search/aggs/agg_types';
import type { IndexPatternsServiceStart } from '../../index_patterns/index_patterns_service';
import type { AggsSetup, AggsStart } from './types';

/** @internal */
export interface AggsSetupDependencies {
  registerFunction: ExpressionsServiceSetup['registerFunction'];
}

/** @internal */
export interface AggsStartDependencies {
  fieldFormats: FieldFormatsStart;
  uiSettings: UiSettingsServiceStart;
  indexPatterns: IndexPatternsServiceStart;
}

/**
 * The aggs service provides a means of modeling and manipulating the various
 * Elasticsearch aggregations supported by Kibana, providing the ability to
 * output the correct DSL when you are ready to send your request to ES.
 */
export class AggsService {
  private readonly aggsCommonService = new AggsCommonService();

  /**
   * getForceNow uses window.location on the client, so we must have a
   * separate implementation of calculateBounds on the server.
   */
  private calculateBounds = (timeRange: TimeRange) => calculateBounds(timeRange, {});

  public setup({ registerFunction }: AggsSetupDependencies): AggsSetup {
    return this.aggsCommonService.setup({ registerFunction });
  }

  public start({ fieldFormats, uiSettings, indexPatterns }: AggsStartDependencies): AggsStart {
    return {
      asScopedToClient: async (
        savedObjectsClient: SavedObjectsClientContract,
        elasticsearchClient: ElasticsearchClient
      ) => {
        const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
        const formats = await fieldFormats.fieldFormatServiceFactory(uiSettingsClient);

        // cache ui settings, only including items which are explicitly needed by aggs
        const uiSettingsCache = pick(await uiSettingsClient.getAll(), aggsRequiredUiSettings);
        const getConfig = <T = any>(key: string): T => {
          return uiSettingsCache[key];
        };
        const isDefaultTimezone = () => getConfig('dateFormat:tz') === 'Browser';

        const {
          calculateAutoTimeExpression,
          datatableUtilities,
          types,
        } = this.aggsCommonService.start({
          getConfig,
          getIndexPattern: (
            await indexPatterns.indexPatternsServiceFactory(savedObjectsClient, elasticsearchClient)
          ).get,
          isDefaultTimezone,
        });

        const aggTypesDependencies: AggTypesDependencies = {
          calculateBounds: this.calculateBounds,
          getConfig,
          getFieldFormatsStart: () => ({
            deserialize: formats.deserialize,
            getDefaultInstance: formats.getDefaultInstance,
          }),
          /**
           * Date histogram and date range need to know whether we are using the
           * default timezone, but `isDefault` is not currently offered on the
           * server, so we need to manually check for the default value.
           */
          isDefaultTimezone,
        };

        const typesRegistry = {
          get: (name: string) => {
            const type = types.get(name);
            if (!type) {
              return;
            }
            return type(aggTypesDependencies);
          },
          getAll: () => {
            return {
              // initialize each agg type on the fly
              buckets: types.getAll().buckets.map((type) => type(aggTypesDependencies)),
              metrics: types.getAll().metrics.map((type) => type(aggTypesDependencies)),
            };
          },
        };

        return {
          calculateAutoTimeExpression,
          datatableUtilities,
          createAggConfigs: (indexPattern, configStates = []) => {
            return new AggConfigs(indexPattern, configStates, { typesRegistry });
          },
          types: typesRegistry,
        };
      },
    };
  }

  public stop() {}
}
