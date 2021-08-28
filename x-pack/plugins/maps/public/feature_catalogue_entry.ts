/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public/services/feature_catalogue/feature_catalogue_registry';
import { APP_ICON, APP_ID } from '../common/constants';
import { getAppTitle } from '../common/i18n_getters';

export const featureCatalogueEntry = {
  id: APP_ID,
  title: getAppTitle(),
  subtitle: i18n.translate('xpack.maps.featureCatalogue.mapsSubtitle', {
    defaultMessage: 'Plot geographic data.',
  }),
  description: i18n.translate('xpack.maps.feature.appDescription', {
    defaultMessage: 'Explore geospatial data from Elasticsearch and the Elastic Maps Service.',
  }),
  icon: APP_ICON,
  path: '/app/maps',
  showOnHomePage: false,
  category: FeatureCatalogueCategory.DATA,
  solutionId: 'kibana',
  order: 400,
};
