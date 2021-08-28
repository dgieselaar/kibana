/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import type { Query } from 'src/plugins/data/public';
import type { ISearchSource } from '../../../../../../../src/plugins/data/common/search/search_source/types';
import type { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters/types';
import {
  AGG_TYPE,
  DEFAULT_MAX_BUCKETS_LIMIT,
  FIELD_ORIGIN,
  SOURCE_TYPES,
} from '../../../../common/constants';
import type {
  VectorJoinSourceRequestMeta,
  VectorSourceSyncMeta,
} from '../../../../common/descriptor_types/data_request_descriptor_types';
import type { ESTermSourceDescriptor } from '../../../../common/descriptor_types/source_descriptor_types';
import type {
  BucketProperties,
  PropertiesMap,
} from '../../../../common/elasticsearch_util/es_agg_utils';
import {
  addFieldToDSL,
  extractPropertiesFromBucket,
  getField,
} from '../../../../common/elasticsearch_util/es_agg_utils';
import { getJoinAggKey } from '../../../../common/get_agg_key';
import { ESDocField } from '../../fields/es_doc_field';
import type { IField } from '../../fields/field';
import { isValidStringConfig } from '../../util/valid_string_config';
import { AbstractESAggSource } from '../es_agg_source/es_agg_source';
import type { ITermJoinSource } from '../term_join_source/term_join_source';

const TERMS_AGG_NAME = 'join';
const TERMS_BUCKET_KEYS_TO_IGNORE = ['key', 'doc_count'];

export function extractPropertiesMap(rawEsData: any, countPropertyName: string): PropertiesMap {
  const propertiesMap: PropertiesMap = new Map<string, BucketProperties>();
  const buckets: any[] = _.get(rawEsData, ['aggregations', TERMS_AGG_NAME, 'buckets'], []);
  buckets.forEach((termBucket: any) => {
    const properties = extractPropertiesFromBucket(termBucket, TERMS_BUCKET_KEYS_TO_IGNORE);
    if (countPropertyName) {
      properties[countPropertyName] = termBucket.doc_count;
    }
    propertiesMap.set(termBucket.key.toString(), properties);
  });
  return propertiesMap;
}

export class ESTermSource extends AbstractESAggSource implements ITermJoinSource {
  static type = SOURCE_TYPES.ES_TERM_SOURCE;

  static createDescriptor(descriptor: Partial<ESTermSourceDescriptor>): ESTermSourceDescriptor {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(descriptor);
    if (!isValidStringConfig(descriptor.term)) {
      throw new Error('Cannot create an ESTermSource without a term');
    }
    return {
      ...normalizedDescriptor,
      indexPatternTitle: descriptor.indexPatternTitle
        ? descriptor.indexPatternTitle
        : descriptor.indexPatternId,
      term: descriptor.term!,
      type: SOURCE_TYPES.ES_TERM_SOURCE,
    };
  }

  private readonly _termField: ESDocField;
  readonly _descriptor: ESTermSourceDescriptor;

  constructor(descriptor: ESTermSourceDescriptor, inspectorAdapters?: Adapters) {
    const sourceDescriptor = ESTermSource.createDescriptor(descriptor);
    super(sourceDescriptor, inspectorAdapters);
    this._descriptor = sourceDescriptor;
    this._termField = new ESDocField({
      fieldName: this._descriptor.term,
      source: this,
      origin: this.getOriginForField(),
    });
  }

  hasCompleteConfig(): boolean {
    return _.has(this._descriptor, 'indexPatternId') && _.has(this._descriptor, 'term');
  }

  getTermField(): ESDocField {
    return this._termField;
  }

  getOriginForField(): FIELD_ORIGIN {
    return FIELD_ORIGIN.JOIN;
  }

  getWhereQuery(): Query | undefined {
    return this._descriptor.whereQuery;
  }

  getAggKey(aggType: AGG_TYPE, fieldName?: string): string {
    return getJoinAggKey({
      aggType,
      aggFieldName: fieldName,
      rightSourceId: this._descriptor.id,
    });
  }

  getAggLabel(aggType: AGG_TYPE, fieldLabel: string): string {
    return aggType === AGG_TYPE.COUNT
      ? i18n.translate('xpack.maps.source.esJoin.countLabel', {
          defaultMessage: `Count of {indexPatternTitle}`,
          values: { indexPatternTitle: this._descriptor.indexPatternTitle },
        })
      : super.getAggLabel(aggType, fieldLabel);
  }

  async getPropertiesMap(
    searchFilters: VectorJoinSourceRequestMeta,
    leftSourceName: string,
    leftFieldName: string,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<PropertiesMap> {
    if (!this.hasCompleteConfig()) {
      return new Map<string, BucketProperties>();
    }

    const indexPattern = await this.getIndexPattern();
    const searchSource: ISearchSource = await this.makeSearchSource(searchFilters, 0);
    searchSource.setField('trackTotalHits', false);
    const termsField = getField(indexPattern, this._termField.getName());
    const termsAgg = {
      size: this._descriptor.size !== undefined ? this._descriptor.size : DEFAULT_MAX_BUCKETS_LIMIT,
    };
    searchSource.setField('aggs', {
      [TERMS_AGG_NAME]: {
        terms: addFieldToDSL(termsAgg, termsField),
        aggs: { ...this.getValueAggsDsl(indexPattern) },
      },
    });

    const rawEsData = await this._runEsQuery({
      requestId: this.getId(),
      requestName: `${this._descriptor.indexPatternTitle}.${this._termField.getName()}`,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esJoin.joinDescription', {
        defaultMessage: `Elasticsearch terms aggregation request, left source: {leftSource}, right source: {rightSource}`,
        values: {
          leftSource: `${leftSourceName}:${leftFieldName}`,
          rightSource: `${this._descriptor.indexPatternTitle}:${this._termField.getName()}`,
        },
      }),
      searchSessionId: searchFilters.searchSessionId,
    });

    const countPropertyName = this.getAggKey(AGG_TYPE.COUNT);
    return extractPropertiesMap(rawEsData, countPropertyName);
  }

  isFilterByMapBounds(): boolean {
    return false;
  }

  async getDisplayName(): Promise<string> {
    // no need to localize. this is never rendered.
    return `es_table ${this.getIndexPatternId()}`;
  }

  getFieldNames(): string[] {
    return this.getMetricFields().map((esAggMetricField) => esAggMetricField.getName());
  }

  getSyncMeta(): VectorSourceSyncMeta | null {
    return this._descriptor.size !== undefined
      ? {
          size: this._descriptor.size,
        }
      : null;
  }

  getRightFields(): IField[] {
    return this.getMetricFields();
  }
}
