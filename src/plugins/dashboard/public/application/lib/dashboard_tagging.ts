/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObject } from '../../../../saved_objects/public/types';
import type { SavedObjectsTaggingApi } from '../../../../saved_objects_tagging_oss/public/api';
import type { TagDecoratedSavedObject } from '../../../../saved_objects_tagging_oss/public/decorator/types';
import type { DashboardSavedObject } from '../../saved_dashboards/saved_dashboard';

// TS is picky with type guards, we can't just inline `() => false`
function defaultTaggingGuard(_obj: SavedObject): _obj is TagDecoratedSavedObject {
  return false;
}

export const getTagsFromSavedDashboard = (
  savedDashboard: DashboardSavedObject,
  api?: SavedObjectsTaggingApi
) => {
  const hasTaggingCapabilities = getHasTaggingCapabilitiesGuard(api);
  return hasTaggingCapabilities(savedDashboard) ? savedDashboard.getTags() : [];
};

export const getHasTaggingCapabilitiesGuard = (api?: SavedObjectsTaggingApi) =>
  api?.ui.hasTagDecoration || defaultTaggingGuard;
