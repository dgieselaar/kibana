/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { MapStoreState } from '../../../reducers/store';
import { getMapColors } from '../../../selectors/map_selectors';
import { FlyoutBody } from './flyout_body';

function mapStateToProps(state: MapStoreState) {
  return {
    mapColors: getMapColors(state),
  };
}

const connected = connect(mapStateToProps, {})(FlyoutBody);
export { connected as FlyoutBody };
