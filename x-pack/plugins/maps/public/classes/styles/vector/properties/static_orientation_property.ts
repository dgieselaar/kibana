/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Map as MbMap } from '@kbn/mapbox-gl';
import { VECTOR_STYLES } from '../../../../../common/constants';
import type { OrientationStaticOptions } from '../../../../../common/descriptor_types/style_property_descriptor_types';
import { StaticStyleProperty } from './static_style_property';

export class StaticOrientationProperty extends StaticStyleProperty<OrientationStaticOptions> {
  constructor(options: OrientationStaticOptions, styleName: VECTOR_STYLES) {
    if (typeof options.orientation !== 'number') {
      super({ orientation: 0 }, styleName);
    } else {
      super(options, styleName);
    }
  }

  syncIconRotationWithMb(symbolLayerId: string, mbMap: MbMap) {
    mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', this._options.orientation);
  }
}
