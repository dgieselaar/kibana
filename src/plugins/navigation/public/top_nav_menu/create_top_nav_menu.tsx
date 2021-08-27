/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { I18nStart } from '../../../../core/public/i18n/i18n_service';
import type { DataPublicPluginStart } from '../../../data/public/types';
import type { TopNavMenuProps } from './top_nav_menu';
import { TopNavMenu } from './top_nav_menu';
import type { RegisteredTopNavMenuData } from './top_nav_menu_data';

export function createTopNav(
  data: DataPublicPluginStart,
  extraConfig: RegisteredTopNavMenuData[],
  i18n: I18nStart
) {
  return (props: TopNavMenuProps) => {
    const relevantConfig = extraConfig.filter(
      (dataItem) => dataItem.appName === undefined || dataItem.appName === props.appName
    );
    const config = (props.config || []).concat(relevantConfig);

    return (
      <i18n.Context>
        <TopNavMenu {...props} data={data} config={config} />
      </i18n.Context>
    );
  };
}
