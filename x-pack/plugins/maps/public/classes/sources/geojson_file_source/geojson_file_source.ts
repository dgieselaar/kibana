/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Feature, FeatureCollection } from 'geojson';
import type { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters/types';
import { EMPTY_FEATURE_COLLECTION, FIELD_ORIGIN, SOURCE_TYPES } from '../../../../common/constants';
import type { MapExtent } from '../../../../common/descriptor_types/map_descriptor';
import type {
  GeojsonFileSourceDescriptor,
  InlineFieldDescriptor,
} from '../../../../common/descriptor_types/source_descriptor_types';
import type { IField } from '../../fields/field';
import { InlineField } from '../../fields/inline_field';
import { getFeatureCollectionBounds } from '../../util/get_feature_collection_bounds';
import { registerSource } from '../source_registry';
import type { BoundsFilters, GeoJsonWithMeta } from '../vector_source/vector_source';
import { AbstractVectorSource } from '../vector_source/vector_source';

function getFeatureCollection(
  geoJson: Feature | FeatureCollection | null | undefined
): FeatureCollection {
  if (!geoJson) {
    return EMPTY_FEATURE_COLLECTION;
  }

  if (geoJson.type === 'FeatureCollection') {
    return geoJson;
  }

  if (geoJson.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [geoJson],
    };
  }

  return EMPTY_FEATURE_COLLECTION;
}

export class GeoJsonFileSource extends AbstractVectorSource {
  static createDescriptor(
    descriptor: Partial<GeojsonFileSourceDescriptor>
  ): GeojsonFileSourceDescriptor {
    return {
      type: SOURCE_TYPES.GEOJSON_FILE,
      __featureCollection: getFeatureCollection(descriptor.__featureCollection),
      __fields: descriptor.__fields || [],
      areResultsTrimmed:
        descriptor.areResultsTrimmed !== undefined ? descriptor.areResultsTrimmed : false,
      tooltipContent: descriptor.tooltipContent ? descriptor.tooltipContent : null,
      name: descriptor.name || 'Features',
    };
  }

  constructor(descriptor: Partial<GeojsonFileSourceDescriptor>, inspectorAdapters?: Adapters) {
    const normalizedDescriptor = GeoJsonFileSource.createDescriptor(descriptor);
    super(normalizedDescriptor, inspectorAdapters);
  }

  _getFields(): InlineFieldDescriptor[] {
    const fields = (this._descriptor as GeojsonFileSourceDescriptor).__fields;
    return fields ? fields : [];
  }

  createField({ fieldName }: { fieldName: string }): IField {
    const fields = this._getFields();
    const descriptor: InlineFieldDescriptor | undefined = fields.find((field) => {
      return field.name === fieldName;
    });

    if (!descriptor) {
      throw new Error(
        `Cannot find corresponding field ${fieldName} in __fields array ${JSON.stringify(
          this._getFields()
        )} `
      );
    }
    return new InlineField<GeoJsonFileSource>({
      fieldName: descriptor.name,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
      dataType: descriptor.type,
    });
  }

  async getFields(): Promise<IField[]> {
    const fields = this._getFields();
    return fields.map((field: InlineFieldDescriptor) => {
      return new InlineField<GeoJsonFileSource>({
        fieldName: field.name,
        source: this,
        origin: FIELD_ORIGIN.SOURCE,
        dataType: field.type,
      });
    });
  }

  isBoundsAware(): boolean {
    return true;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsFilters,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    const featureCollection = (this._descriptor as GeojsonFileSourceDescriptor).__featureCollection;
    return getFeatureCollectionBounds(featureCollection, false);
  }

  async getGeoJsonWithMeta(): Promise<GeoJsonWithMeta> {
    return {
      data: (this._descriptor as GeojsonFileSourceDescriptor).__featureCollection,
      meta: {},
    };
  }

  async getDisplayName() {
    return (this._descriptor as GeojsonFileSourceDescriptor).name;
  }

  hasTooltipProperties() {
    return true;
  }

  getSourceTooltipContent() {
    return {
      tooltipContent: (this._descriptor as GeojsonFileSourceDescriptor).tooltipContent,
      areResultsTrimmed: (this._descriptor as GeojsonFileSourceDescriptor).areResultsTrimmed,
    };
  }
}

registerSource({
  ConstructorFunction: GeoJsonFileSource,
  type: SOURCE_TYPES.GEOJSON_FILE,
});
