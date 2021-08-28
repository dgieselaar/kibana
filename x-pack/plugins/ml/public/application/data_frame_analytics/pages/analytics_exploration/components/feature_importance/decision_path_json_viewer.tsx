/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCodeBlock } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import type { FeatureImportance } from '../../../../../../../common/types/feature_importance';

interface DecisionPathJSONViewerProps {
  featureImportance: FeatureImportance[];
}
export const DecisionPathJSONViewer: FC<DecisionPathJSONViewerProps> = ({ featureImportance }) => {
  return <EuiCodeBlock isCopyable={true}>{JSON.stringify(featureImportance)}</EuiCodeBlock>;
};
