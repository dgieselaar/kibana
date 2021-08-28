/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FeatureKibanaPrivileges } from '../../../../../features/common/feature_kibana_privileges';
import type { KibanaFeature } from '../../../../../features/common/kibana_feature';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

export class FeaturePrivilegeUIBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: KibanaFeature
  ): string[] {
    return privilegeDefinition.ui.map((ui) => this.actions.ui.get(feature.id, ui));
  }
}
