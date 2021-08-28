/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { IFieldType } from '../../../../../src/plugins/data/common/index_patterns/fields/types';
import { SingleFieldSelect } from './single_field_select';

interface Props {
  value: string;
  geoFields: IFieldType[];
  onChange: (geoFieldName?: string) => void;
}

export function GeoFieldSelect(props: Props) {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.maps.source.geofieldLabel', {
        defaultMessage: 'Geospatial field',
      })}
    >
      <SingleFieldSelect
        placeholder={i18n.translate('xpack.maps.source.selectLabel', {
          defaultMessage: 'Select geo field',
        })}
        value={props.value}
        onChange={props.onChange}
        fields={props.geoFields}
      />
    </EuiFormRow>
  );
}
