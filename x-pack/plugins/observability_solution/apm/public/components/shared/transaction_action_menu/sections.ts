/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { getLogsLocatorsFromUrlService } from '@kbn/logs-shared-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import type { AssetDetailsLocator } from '@kbn/observability-shared-plugin/common';
import type { ProfilingLocators } from '@kbn/observability-shared-plugin/public';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import { Location } from 'history';
import { isEmpty, pickBy } from 'lodash';
import moment from 'moment';
import { Environment } from '../../../../common/environment_rt';
import { HOST_NAME, TRACE_ID } from '../../../../common/es_fields/apm';
import { ApmRouter } from '../../routing/apm_route_config';
import { getDiscoverHref } from '../links/discover_links/discover_link';
import { getDiscoverQuery } from '../links/discover_links/discover_transaction_link';
import { Action, SectionRecord, getNonEmptySections } from './sections_helper';
import { TransactionForActionMenu } from './transaction_action_menu';

function getInfraMetricsQuery(transaction: { '@timestamp': string }) {
  const timestamp = new Date(transaction['@timestamp']).getTime();
  const fiveMinutes = moment.duration(5, 'minutes').asMilliseconds();

  return {
    from: new Date(timestamp - fiveMinutes).toISOString(),
    to: new Date(timestamp + fiveMinutes).toISOString(),
  };
}

export const getSections = ({
  transaction,
  basePath,
  location,
  apmRouter,
  infraLinksAvailable,
  uptimeLocator,
  profilingLocators,
  rangeFrom,
  rangeTo,
  environment,
  logsLocators,
  dataViewId,
  assetDetailsLocator,
}: {
  transaction?: TransactionForActionMenu;
  basePath: IBasePath;
  location: Location;
  apmRouter: ApmRouter;
  infraLinksAvailable: boolean;
  uptimeLocator?: LocatorPublic<SerializableRecord>;
  profilingLocators?: ProfilingLocators;
  rangeFrom: string;
  rangeTo: string;
  environment: Environment;
  logsLocators: ReturnType<typeof getLogsLocatorsFromUrlService>;
  dataViewId?: string;
  assetDetailsLocator?: AssetDetailsLocator;
}) => {
  if (!transaction) return [];

  const hostName = transaction.host?.name ?? transaction.host?.hostname;
  const podId = transaction.kubernetes?.pod?.uid as string | undefined;
  const containerId = transaction.container?.id;

  const time = Math.round(transaction.timestamp.us / 1000);
  const infraMetricsQuery = getInfraMetricsQuery(transaction);

  const uptimeLink = uptimeLocator?.getRedirectUrl(
    pickBy(
      {
        dateRangeStart: rangeFrom,
        dateRangeEnd: rangeTo,
        search: `url.domain:"${transaction.url?.domain}"`,
      },
      (val) => !isEmpty(val)
    )
  );

  // Logs hrefs
  const podLogsHref = logsLocators.nodeLogsLocator.getRedirectUrl({
    nodeField: findInventoryFields('pod').id,
    nodeId: podId!,
    time,
  });
  const containerLogsHref = logsLocators.nodeLogsLocator.getRedirectUrl({
    nodeField: findInventoryFields('container').id,
    nodeId: containerId!,
    time,
  });
  const hostLogsHref = logsLocators.nodeLogsLocator.getRedirectUrl({
    nodeField: findInventoryFields('host').id,
    nodeId: hostName!,
    time,
  });

  const traceLogsHref = logsLocators.traceLogsLocator.getRedirectUrl({
    traceId: transaction.trace.id!,
    time,
  });

  const hasPodLink = !!podId && infraLinksAvailable && !!assetDetailsLocator;
  const hasContainerLink = !!containerId && infraLinksAvailable && !!assetDetailsLocator;
  const hasHostLink = !!hostName && infraLinksAvailable && !!assetDetailsLocator;

  const podActions: Action[] = [
    {
      key: 'podLogs',
      label: i18n.translate('xpack.apm.transactionActionMenu.showPodLogsLinkLabel', {
        defaultMessage: 'Pod logs',
      }),
      href: podLogsHref,
      condition: !!podId,
    },
    {
      key: 'podMetrics',
      label: i18n.translate('xpack.apm.transactionActionMenu.showPodMetricsLinkLabel', {
        defaultMessage: 'Pod metrics',
      }),
      href: hasPodLink
        ? assetDetailsLocator.getRedirectUrl({
            assetId: podId,
            assetType: 'pod',
            assetDetails: {
              dateRange: infraMetricsQuery,
            },
          })
        : undefined,
      condition: hasPodLink,
    },
  ];

  const containerActions: Action[] = [
    {
      key: 'containerLogs',
      label: i18n.translate('xpack.apm.transactionActionMenu.showContainerLogsLinkLabel', {
        defaultMessage: 'Container logs',
      }),
      href: containerLogsHref,
      condition: !!containerId,
    },
    {
      key: 'containerMetrics',
      label: i18n.translate('xpack.apm.transactionActionMenu.showContainerMetricsLinkLabel', {
        defaultMessage: 'Container metrics',
      }),
      href: hasContainerLink
        ? assetDetailsLocator.getRedirectUrl({
            assetId: containerId,
            assetType: 'container',
            assetDetails: { dateRange: infraMetricsQuery },
          })
        : undefined,
      condition: hasContainerLink,
    },
  ];

  const hostActions: Action[] = [
    {
      key: 'hostLogs',
      label: i18n.translate('xpack.apm.transactionActionMenu.showHostLogsLinkLabel', {
        defaultMessage: 'Host logs',
      }),
      href: hostLogsHref,
      condition: !!hostName,
    },
    {
      key: 'hostMetrics',
      label: i18n.translate('xpack.apm.transactionActionMenu.showHostMetricsLinkLabel', {
        defaultMessage: 'Host metrics',
      }),
      href: hasHostLink
        ? assetDetailsLocator.getRedirectUrl({
            assetId: hostName,
            assetType: 'host',
            assetDetails: {
              dateRange: infraMetricsQuery,
            },
          })
        : undefined,
      condition: hasHostLink,
    },
    {
      key: 'hostProfilingFlamegraph',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showHostProfilingFlamegraphLinkLabel',
        { defaultMessage: 'Host flamegraph' }
      ),
      href: profilingLocators?.flamegraphLocator.getRedirectUrl({
        kuery: `${HOST_NAME}: "${hostName}"`,
      }),
      condition: !!hostName && !!profilingLocators,
    },
    {
      key: 'hostProfilingTopNFunctions',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showHostProfilingTopNFunctionsLinkLabel',
        { defaultMessage: 'Host topN functions' }
      ),
      href: profilingLocators?.topNFunctionsLocator.getRedirectUrl({
        kuery: `${HOST_NAME}: "${hostName}"`,
      }),
      condition: !!hostName && !!profilingLocators,
    },
    {
      key: 'hostProfilingStacktraces',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showHostProfilingStacktracesLinkLabel',
        { defaultMessage: 'Host stacktraces' }
      ),
      href: profilingLocators?.stacktracesLocator.getRedirectUrl({
        kuery: `${HOST_NAME}: "${hostName}"`,
      }),
      condition: !!hostName && !!profilingLocators,
    },
  ];

  const logActions: Action[] = [
    {
      key: 'traceLogs',
      label: i18n.translate('xpack.apm.transactionActionMenu.showTraceLogsLinkLabel', {
        defaultMessage: 'Trace logs',
      }),
      href: traceLogsHref,
      condition: true,
    },
  ];

  const uptimeActions: Action[] = [
    {
      key: 'monitorStatus',
      label: i18n.translate('xpack.apm.transactionActionMenu.viewInUptime', {
        defaultMessage: 'Status',
      }),
      href: uptimeLink,
      condition: !!transaction.url?.domain && !!uptimeLink,
    },
  ];

  const kibanaActions: Action[] = [
    {
      key: 'sampleDocument',
      label: i18n.translate('xpack.apm.transactionActionMenu.viewSampleDocumentLinkLabel', {
        defaultMessage: 'View transaction in Discover',
      }),
      href: getDiscoverHref({
        basePath,
        query: getDiscoverQuery(transaction),
        location,
        dataViewId: dataViewId ?? '',
      }),
      condition: !!dataViewId,
    },
  ];

  const serviceMapHref = apmRouter.link('/service-map', {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery: `${TRACE_ID} : "${transaction.trace.id}"`,
      serviceGroup: '',
      comparisonEnabled: false,
    },
  });
  const serviceMapActions: Action[] = [
    {
      key: 'serviceMap',
      label: i18n.translate('xpack.apm.transactionActionMenu.showInServiceMapLinkLabel', {
        defaultMessage: 'Show in service map',
      }),
      href: serviceMapHref,
      condition: true,
    },
  ];

  const sectionRecord: SectionRecord = {
    observability: [
      {
        key: 'podDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.pod.title', {
          defaultMessage: 'Pod details',
        }),
        subtitle: i18n.translate('xpack.apm.transactionActionMenu.pod.subtitle', {
          defaultMessage: 'View logs and metrics for this pod to get further details.',
        }),
        actions: podActions,
      },
      {
        key: 'containerDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.container.title', {
          defaultMessage: 'Container details',
        }),
        subtitle: i18n.translate('xpack.apm.transactionActionMenu.container.subtitle', {
          defaultMessage: 'View logs and metrics for this container to get further details.',
        }),
        actions: containerActions,
      },
      {
        key: 'hostDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.host.title', {
          defaultMessage: 'Host details',
        }),
        subtitle: i18n.translate('xpack.apm.transactionActionMenu.host.subtitle', {
          defaultMessage: 'View host logs and metrics to get further details.',
        }),
        actions: hostActions,
      },
      {
        key: 'traceDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.trace.title', {
          defaultMessage: 'Trace details',
        }),
        subtitle: i18n.translate('xpack.apm.transactionActionMenu.trace.subtitle', {
          defaultMessage: 'View trace logs to get further details.',
        }),
        actions: logActions,
      },
      {
        key: 'statusDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.status.title', {
          defaultMessage: 'Status details',
        }),
        subtitle: i18n.translate('xpack.apm.transactionActionMenu.status.subtitle', {
          defaultMessage: 'View status to get further details.',
        }),
        actions: uptimeActions,
      },
      {
        key: 'serviceMap',
        title: i18n.translate('xpack.apm.transactionActionMenu.serviceMap.title', {
          defaultMessage: 'Service Map',
        }),
        subtitle: i18n.translate('xpack.apm.transactionActionMenu.serviceMap.subtitle', {
          defaultMessage: 'View service map filtered by this trace.',
        }),
        actions: serviceMapActions,
      },
    ],
    kibana: [{ key: 'kibana', actions: kibanaActions }],
  };

  // Filter out actions that shouldnt be shown and sections without any actions.
  return getNonEmptySections(sectionRecord);
};
