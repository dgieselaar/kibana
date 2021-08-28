/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { connect } from 'react-redux';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { DRAW_SHAPE } from '../../../../../common/constants';
import { updateEditShape } from '../../../../actions/map_actions';
import type { MapStoreState } from '../../../../reducers/store';
import { getEditState } from '../../../../selectors/map_selectors';
import type { OwnProps, ReduxDispatchProps, ReduxStateProps } from './feature_edit_tools';
import { FeatureEditTools } from './feature_edit_tools';

function mapStateToProps(state: MapStoreState): ReduxStateProps {
  const editState = getEditState(state);
  return {
    drawShape: editState ? editState.drawShape : undefined,
  };
}

function mapDispatchToProps(
  dispatch: ThunkDispatch<MapStoreState, void, AnyAction>
): ReduxDispatchProps {
  return {
    setDrawShape: (shapeToDraw: DRAW_SHAPE) => {
      dispatch(updateEditShape(shapeToDraw));
    },
  };
}

const connectedFeatureEditControl = connect<
  ReduxStateProps,
  ReduxDispatchProps,
  OwnProps,
  MapStoreState
>(
  mapStateToProps,
  mapDispatchToProps
)(FeatureEditTools);
export { connectedFeatureEditControl as FeatureEditTools };
