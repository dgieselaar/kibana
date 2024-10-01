/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { set } from '@kbn/safer-lodash-set';
import Mustache from 'mustache';
import { castArray, isEmpty } from 'lodash';
import type { FlattenedTransaction } from '../../server/routes/settings/custom_link/get_transaction';

export const INVALID_LICENSE = i18n.translate('xpack.apm.settings.customLink.license.text', {
  defaultMessage:
    "To create custom links, you must be subscribed to an Elastic Gold license or above. With it, you'll have the ability to create custom links to improve your workflow when analyzing your services.",
});

export const NO_PERMISSION_LABEL = i18n.translate(
  'xpack.apm.settings.customLink.noPermissionTooltipLabel',
  {
    defaultMessage: "Your user role doesn't have permissions to create custom links",
  }
);

export const extractTemplateVariableNames = (url: string): string[] => {
  const uniqueVariableNames = new Set<string>();
  Mustache.parse(url)
    .filter((v: any[]) => v[0] === 'name')
    .map((v: any[]) => uniqueVariableNames.add(v[1]));
  return Array.from(uniqueVariableNames);
};

export function getEncodedCustomLinkUrl(url: string, transaction?: FlattenedTransaction) {
  try {
    const templateVariables = extractTemplateVariableNames(url);
    const encodedTemplateVariables = {};
    templateVariables.forEach((name) => {
      const value = transaction?.[name];
      if (value && !isEmpty(value)) {
        const encodedValue = encodeURIComponent(String(castArray(value)[0]));
        set(encodedTemplateVariables, name, encodedValue);
      }
    });
    return Mustache.render(url, encodedTemplateVariables);
  } catch (e) {
    return url;
  }
}
