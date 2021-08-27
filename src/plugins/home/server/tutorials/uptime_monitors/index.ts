/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
import { TutorialsCategory } from '../../services/tutorials/lib/tutorials_registry_types';
import type { TutorialSchema } from '../../services/tutorials/lib/tutorial_schema';
import {
  cloudInstructions,
  onPremCloudInstructions,
  onPremInstructions,
} from '../instructions/heartbeat_instructions';

export function uptimeMonitorsSpecProvider(context: TutorialContext): TutorialSchema {
  const moduleName = 'uptime';
  return {
    id: 'uptimeMonitors',
    name: i18n.translate('home.tutorials.uptimeMonitors.nameTitle', {
      defaultMessage: 'Uptime Monitors',
    }),
    moduleName,
    category: TutorialsCategory.METRICS,
    shortDescription: i18n.translate('home.tutorials.uptimeMonitors.shortDescription', {
      defaultMessage: 'Monitor services for their availability',
    }),
    longDescription: i18n.translate('home.tutorials.uptimeMonitors.longDescription', {
      defaultMessage:
        'Monitor services for their availability with active probing. \
        Given a list of URLs, Heartbeat asks the simple question: Are you alive? \
        [Learn more]({learnMoreLink}).',
      values: {
        learnMoreLink: '{config.docs.beats.heartbeat}/heartbeat-installation-configuration.html',
      },
    }),
    euiIconType: 'uptimeApp',
    artifacts: {
      dashboards: [],
      application: {
        path: '/app/uptime',
        label: i18n.translate('home.tutorials.uptimeMonitors.artifacts.dashboards.linkLabel', {
          defaultMessage: 'Uptime App',
        }),
      },
      exportedFields: {
        documentationUrl: '{config.docs.beats.heartbeat}/exported-fields.html',
      },
    },
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/home/assets/uptime_monitors/screenshot.png',
    onPrem: onPremInstructions([], context),
    elasticCloud: cloudInstructions(),
    onPremElasticCloud: onPremCloudInstructions(),
  };
}
