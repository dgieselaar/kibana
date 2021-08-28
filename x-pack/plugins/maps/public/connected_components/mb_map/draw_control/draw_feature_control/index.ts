/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Geometry, Position } from 'geojson';
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import {
  addNewFeatureToIndex,
  deleteFeatureFromIndex,
  updateEditShape,
} from '../../../../actions/map_actions';
import type { MapStoreState } from '../../../../reducers/store';
import { getEditState, getLayerById } from '../../../../selectors/map_selectors';
import { getDrawMode } from '../../../../selectors/ui_selectors';
import type { OwnProps, ReduxDispatchProps, ReduxStateProps } from './draw_feature_control';
import { DrawFeatureControl } from './draw_feature_control';

function mapStateToProps(state: MapStoreState): ReduxStateProps {
  const editState = getEditState(state);
  const editLayer = editState ? getLayerById(editState.layerId, state) : undefined;
  return {
    drawShape: editState ? editState.drawShape : undefined,
    drawMode: getDrawMode(state),
    editLayer,
  };
}

function mapDispatchToProps(
  dispatch: ThunkDispatch<MapStoreState, void, AnyAction>
): ReduxDispatchProps {
  return {
    addNewFeatureToIndex(geometry: Geometry | Position[]) {
      dispatch(addNewFeatureToIndex(geometry));
    },
    deleteFeatureFromIndex(featureId: string) {
      dispatch(deleteFeatureFromIndex(featureId));
    },
    disableDrawState() {
      dispatch(updateEditShape(null));
    },
  };
}

const connected = connect<ReduxStateProps, ReduxDispatchProps, OwnProps, MapStoreState>(
  mapStateToProps,
  mapDispatchToProps
)(DrawFeatureControl);
export { connected as DrawFeatureControl };
