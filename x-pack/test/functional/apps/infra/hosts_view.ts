/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import {
  enableInfrastructureAssetCustomDashboards,
  enableInfrastructureHostsView,
} from '@kbn/observability-plugin/common';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  DATES,
  HOSTS_LINK_LOCAL_STORAGE_KEY,
  HOSTS_VIEW_PATH,
  DATE_PICKER_FORMAT,
} from './constants';
import { generateAddServicesToExistingHost } from './helpers';
import { getApmSynthtraceEsClient } from '../../../common/utils/synthtrace/apm_es_client';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const START_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataStartDate);
const END_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataEndDate);

const tableEntries = [
  {
    alertsCount: 2,
    title: 'demo-stack-apache-01',
    cpuUsage: '0%',
    normalizedLoad: '0.5%',
    memoryUsage: '18.4%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '35.1%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 2,
    title: 'demo-stack-mysql-01',
    cpuUsage: '0%',
    normalizedLoad: '0%',
    memoryUsage: '18.2%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '35.7%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 2,
    title: 'demo-stack-redis-01',
    cpuUsage: '0%',
    normalizedLoad: '0%',
    memoryUsage: '15.9%',
    memoryFree: '3.3 GB',
    diskSpaceUsage: '32.5%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 0,
    title: 'demo-stack-client-01',
    cpuUsage: '0%',
    normalizedLoad: '0.1%',
    memoryUsage: '13.8%',
    memoryFree: '3.3 GB',
    diskSpaceUsage: '33.8%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 0,
    title: 'demo-stack-haproxy-01',
    cpuUsage: '0%',
    normalizedLoad: '0%',
    memoryUsage: '16.5%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '32.6%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 0,
    title: 'demo-stack-nginx-01',
    cpuUsage: '0%',
    normalizedLoad: '1.4%',
    memoryUsage: '18%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '35%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
];

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const security = getService('security');
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const observability = getService('observability');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const apmSynthtraceKibanaClient = getService('apmSynthtraceKibanaClient');

  const pageObjects = getPageObjects([
    'assetDetails',
    'common',
    'infraHome',
    'timePicker',
    'infraHostsView',
    'security',
    'settings',
    'header',
  ]);

  // Helpers

  const loginWithReadOnlyUserAndNavigateToHostsFlyout = async () => {
    await security.role.create('global_hosts_read_privileges_role', {
      elasticsearch: {
        indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [
        {
          feature: {
            infrastructure: ['read'],
            advancedSettings: ['read'],
          },
          spaces: ['*'],
        },
      ],
    });

    await security.user.create('global_hosts_read_privileges_user', {
      password: 'global_hosts_read_privileges_user-password',
      roles: ['global_hosts_read_privileges_role'],
      full_name: 'test user',
    });

    await pageObjects.security.forceLogout();

    await pageObjects.security.login(
      'global_hosts_read_privileges_user',
      'global_hosts_read_privileges_user-password',
      {
        expectSpaceSelector: false,
      }
    );

    await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
    await pageObjects.header.waitUntilLoadingHasFinished();
    await pageObjects.timePicker.setAbsoluteRange(
      START_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT),
      END_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT)
    );

    await waitForPageToLoad();

    await pageObjects.infraHostsView.clickTableOpenFlyoutButton();
  };

  const logoutAndDeleteReadOnlyUser = async () => {
    await pageObjects.security.forceLogout();
    await Promise.all([
      security.role.delete('global_hosts_read_privileges_role'),
      security.user.delete('global_hosts_read_privileges_user'),
    ]);
  };

  const setHostViewEnabled = (value: boolean = true) =>
    kibanaServer.uiSettings.update({ [enableInfrastructureHostsView]: value });

  const setCustomDashboardsEnabled = (value: boolean = true) =>
    kibanaServer.uiSettings.update({ [enableInfrastructureAssetCustomDashboards]: value });

  const returnTo = async (path: string, timeout = 2000) =>
    retry.waitForWithTimeout('returned to hosts view', timeout, async () => {
      await browser.goBack();
      await pageObjects.header.waitUntilLoadingHasFinished();
      const currentUrl = await browser.getCurrentUrl();
      return !!currentUrl.match(path);
    });

  const waitForPageToLoad = async () =>
    await retry.waitFor(
      'wait for table and KPI charts to load',
      async () =>
        (await pageObjects.infraHostsView.isHostTableLoaded()) &&
        (await pageObjects.infraHostsView.isKPIChartsLoaded())
    );

  describe('Hosts View', function () {
    describe('#Onboarding', function () {
      before(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
      });

      it('should show hosts no data page and redirect onboarding page', async () => {
        await pageObjects.infraHome.noDataPromptExists();
        await pageObjects.infraHome.noDataPromptAddDataClick();

        await retry.try(async () => {
          const currentUrl = await browser.getCurrentUrl();
          const parsedUrl = new URL(currentUrl);
          const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
          const expectedUrlPattern = `${baseUrl}/app/observabilityOnboarding/?category=logs`;
          expect(currentUrl).to.equal(expectedUrlPattern);
        });
      });
    });

    describe('#With data', function () {
      let synthtraceApmClient: ApmSynthtraceEsClient;
      before(async () => {
        const version = (await apmSynthtraceKibanaClient.installApmPackage()).version;
        synthtraceApmClient = await getApmSynthtraceEsClient({
          client: esClient,
          packageVersion: version,
        });

        const services = generateAddServicesToExistingHost({
          from: DATES.metricsAndLogs.hosts.processesDataStartDate,
          to: DATES.metricsAndLogs.hosts.processesDataEndDate,
          hostName: 'Jennys-MBP.fritz.box',
          servicesPerHost: 3,
        });

        await browser.setWindowSize(1600, 1200);

        return Promise.all([
          synthtraceApmClient.index(services),
          esArchiver.load('x-pack/test/functional/es_archives/infra/alerts'),
          esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
          esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
        ]);
      });

      after(async () => {
        return Promise.all([
          apmSynthtraceKibanaClient.uninstallApmPackage(),
          synthtraceApmClient.clean(),
          esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts'),
          esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
          esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
          browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY),
        ]);
      });

      it('should be accessible from the Inventory page', async () => {
        await pageObjects.common.navigateToApp('infraOps');

        await pageObjects.infraHome.clickDismissKubernetesTourButton();
        await pageObjects.infraHostsView.getBetaBadgeExists();
        await pageObjects.infraHostsView.clickTryHostViewBadge();

        const pageUrl = await browser.getCurrentUrl();

        expect(pageUrl).to.contain(HOSTS_VIEW_PATH);
      });

      describe('#Single Host Flyout', () => {
        before(async () => {
          await setHostViewEnabled(true);
          await setCustomDashboardsEnabled(true);
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.header.waitUntilLoadingHasFinished();
        });

        describe('Tabs', () => {
          before(async () => {
            await pageObjects.timePicker.setAbsoluteRange(
              START_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT),
              END_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT)
            );

            await waitForPageToLoad();

            await pageObjects.infraHostsView.clickTableOpenFlyoutButton();
          });

          after(async () => {
            await retry.try(async () => {
              await pageObjects.infraHome.clickCloseFlyoutButton();
            });
          });

          describe('Overview Tab', () => {
            before(async () => {
              await pageObjects.assetDetails.clickOverviewTab();
            });

            [
              { metric: 'cpuUsage', value: '13.9%' },
              { metric: 'normalizedLoad1m', value: '18.8%' },
              { metric: 'memoryUsage', value: '94.9%' },
              { metric: 'diskUsage', value: 'N/A' },
            ].forEach(({ metric, value }) => {
              it(`${metric} tile should show ${value}`, async () => {
                await retry.try(async () => {
                  const tileValue = await pageObjects.assetDetails.getAssetDetailsKPITileValue(
                    metric
                  );
                  expect(tileValue).to.eql(value);
                });
              });
            });

            [
              { metric: 'cpu', chartsCount: 2 },
              { metric: 'memory', chartsCount: 1 },
              { metric: 'disk', chartsCount: 2 },
              { metric: 'network', chartsCount: 1 },
            ].forEach(({ metric, chartsCount }) => {
              it(`should render ${chartsCount} ${metric} chart(s) in the Metrics section`, async () => {
                const hosts = await pageObjects.assetDetails.getOverviewTabHostMetricCharts(metric);
                expect(hosts.length).to.equal(chartsCount);
              });
            });

            it('should show all section as collapsible', async () => {
              await pageObjects.assetDetails.metadataSectionCollapsibleExist();
              await pageObjects.assetDetails.alertsSectionCollapsibleExist();
              await pageObjects.assetDetails.metricsSectionCollapsibleExist();
              await pageObjects.assetDetails.servicesSectionCollapsibleExist();
            });

            it('should show alerts', async () => {
              await pageObjects.header.waitUntilLoadingHasFinished();
              await pageObjects.assetDetails.overviewAlertsTitleExists();
            });

            it('should show 3 services each with an icon, service name, and url', async () => {
              await pageObjects.assetDetails.servicesSectionCollapsibleExist();

              const services =
                await pageObjects.assetDetails.getAssetDetailsServicesWithIconsAndNames();

              expect(services.length).to.equal(3);

              const currentUrl = await browser.getCurrentUrl();
              const parsedUrl = new URL(currentUrl);
              const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

              services.forEach((service, index) => {
                expect(service.serviceName).to.equal(`service-${index}`);
                expect(service.iconSrc).to.not.be.empty();
                const expectedUrlPattern = `${baseUrl}/app/apm/services/service-${index}/overview?rangeFrom=${DATES.metricsAndLogs.hosts.processesDataStartDate}&rangeTo=${DATES.metricsAndLogs.hosts.processesDataEndDate}`;
                expect(service.serviceUrl).to.equal(expectedUrlPattern);
              });
            });
          });

          describe('Metadata Tab', () => {
            before(async () => {
              await pageObjects.assetDetails.clickMetadataTab();
            });

            it('should show metadata table', async () => {
              await pageObjects.assetDetails.metadataTableExists();
            });

            it('should render metadata tab, add and remove filter', async () => {
              // Add Filter
              await pageObjects.assetDetails.clickAddMetadataFilter();
              await pageObjects.header.waitUntilLoadingHasFinished();

              const addedFilter = await pageObjects.assetDetails.getMetadataAppliedFilter();
              expect(addedFilter).to.contain('host.architecture: arm64');
              const removeFilterExists =
                await pageObjects.assetDetails.metadataRemoveFilterExists();
              expect(removeFilterExists).to.be(true);

              // Remove filter
              await pageObjects.assetDetails.clickRemoveMetadataFilter();
              await pageObjects.header.waitUntilLoadingHasFinished();
              const removeFilterShouldNotExist =
                await pageObjects.assetDetails.metadataRemovePinExists();
              expect(removeFilterShouldNotExist).to.be(false);
            });
          });

          describe('Metrics Tab', () => {
            before(async () => {
              await pageObjects.assetDetails.clickMetricsTab();
            });

            it('should show metrics content', async () => {
              await pageObjects.assetDetails.metricsChartsContentExists();
            });
          });

          describe('Processes Tab', () => {
            before(async () => {
              await pageObjects.assetDetails.clickProcessesTab();
            });

            it('should show processes table', async () => {
              await pageObjects.assetDetails.processesTableExists();
            });
          });

          describe('Logs Tab', () => {
            before(async () => {
              await pageObjects.assetDetails.clickLogsTab();
            });

            it('should render logs tab', async () => {
              await pageObjects.assetDetails.logsExists();
            });
          });

          describe('Dashboards Tab', () => {
            before(async () => {
              await pageObjects.assetDetails.clickDashboardsTab();
            });

            it('should render dashboards tab splash screen with option to add dashboard', async () => {
              await pageObjects.assetDetails.addDashboardExists();
            });
          });

          describe('Flyout links', () => {
            it('should navigate to Host Details page after click', async () => {
              await pageObjects.assetDetails.clickOpenAsPageLink();
              const dateRange = await pageObjects.timePicker.getTimeConfigAsAbsoluteTimes();
              expect(dateRange.start).to.equal(
                START_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT)
              );
              expect(dateRange.end).to.equal(END_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT));

              await returnTo(HOSTS_VIEW_PATH);
            });
          });
        });
      });

      describe('#Page Content', () => {
        before(async () => {
          await setHostViewEnabled(true);
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.header.waitUntilLoadingHasFinished();
          await pageObjects.timePicker.setAbsoluteRange(
            START_DATE.format(DATE_PICKER_FORMAT),
            END_DATE.format(DATE_PICKER_FORMAT)
          );

          await waitForPageToLoad();
        });

        it('should render the correct page title', async () => {
          const documentTitle = await browser.getTitle();
          expect(documentTitle).to.contain('Hosts - Infrastructure - Observability - Elastic');
        });

        it('should render the title beta badge', async () => {
          await pageObjects.infraHostsView.getBetaBadgeExists();
        });

        describe('Hosts table', () => {
          let hostRows: WebElementWrapper[] = [];

          before(async () => {
            hostRows = await pageObjects.infraHostsView.getHostsTableData();
          });

          it('should render a table with 6 hosts', async () => {
            expect(hostRows.length).to.equal(6);
          });

          it('should render the computed metrics for each host entry', async () => {
            for (let i = 0; i < hostRows.length; i++) {
              const hostRowData = await pageObjects.infraHostsView.getHostsRowData(hostRows[i]);
              expect(hostRowData).to.eql(tableEntries[i]);
            }
          });

          it('should select and filter hosts inside the table', async () => {
            const selectHostsButtonExistsOnLoad =
              await pageObjects.infraHostsView.selectedHostsButtonExist();
            expect(selectHostsButtonExistsOnLoad).to.be(false);

            await pageObjects.infraHostsView.clickHostCheckbox('demo-stack-client-01', '-');
            await pageObjects.infraHostsView.clickHostCheckbox('demo-stack-apache-01', '-');

            const selectHostsButtonExistsOnSelection =
              await pageObjects.infraHostsView.selectedHostsButtonExist();
            expect(selectHostsButtonExistsOnSelection).to.be(true);

            await pageObjects.infraHostsView.clickSelectedHostsButton();
            await pageObjects.infraHostsView.clickSelectedHostsAddFilterButton();

            await pageObjects.header.waitUntilLoadingHasFinished();
            const hostRowsAfterFilter = await pageObjects.infraHostsView.getHostsTableData();
            expect(hostRowsAfterFilter.length).to.equal(2);

            const deleteFilterButton = await find.byCssSelector(
              `[title="Delete host.name: demo-stack-client-01 OR host.name: demo-stack-apache-01"]`
            );
            await deleteFilterButton.click();
            await pageObjects.header.waitUntilLoadingHasFinished();
            const hostRowsAfterRemovingFilter =
              await pageObjects.infraHostsView.getHostsTableData();
            expect(hostRowsAfterRemovingFilter.length).to.equal(6);
          });
        });

        describe('Host details page navigation', () => {
          after(async () => {
            await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
            await pageObjects.header.waitUntilLoadingHasFinished();
            await pageObjects.timePicker.setAbsoluteRange(
              START_DATE.format(DATE_PICKER_FORMAT),
              END_DATE.format(DATE_PICKER_FORMAT)
            );

            await waitForPageToLoad();
          });

          it('should maintain the selected date range when navigating to the individual host details', async () => {
            const start = START_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT);
            const end = END_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT);

            await pageObjects.timePicker.setAbsoluteRange(start, end);

            await waitForPageToLoad();

            const hostDetailLinks = await pageObjects.infraHostsView.getAllHostDetailLinks();
            expect(hostDetailLinks.length).not.to.equal(0);

            await hostDetailLinks[0].click();

            expect(await pageObjects.timePicker.timePickerExists()).to.be(true);

            const datePickerValue = await pageObjects.timePicker.getTimeConfig();
            expect(datePickerValue.start).to.equal(start);
            expect(datePickerValue.end).to.equal(end);
          });
        });

        describe('KPIs', () => {
          [
            { metric: 'hostsCount', value: '6' },
            { metric: 'cpuUsage', value: 'N/A' },
            { metric: 'normalizedLoad1m', value: '0.3%' },
            { metric: 'memoryUsage', value: '16.8%' },
            { metric: 'diskUsage', value: '35.7%' },
          ].forEach(({ metric, value }) => {
            it(`${metric} tile should show ${value}`, async () => {
              await retry.try(async () => {
                const tileValue =
                  metric === 'hostsCount'
                    ? await pageObjects.infraHostsView.getKPITileValue(metric)
                    : await pageObjects.assetDetails.getAssetDetailsKPITileValue(metric);

                expect(tileValue).to.eql(value);
              });
            });
          });
        });

        describe('Metrics Tab', () => {
          before(async () => {
            await browser.scrollTop();
            await pageObjects.infraHostsView.visitMetricsTab();
          });

          after(async () => {
            await browser.scrollTop();
          });

          it('should load 11 lens metric charts', async () => {
            const metricCharts = await pageObjects.infraHostsView.getAllMetricsCharts();
            expect(metricCharts.length).to.equal(11);
          });

          it('should have an option to open the chart in lens', async () => {
            await retry.try(async () => {
              await pageObjects.infraHostsView.clickAndValidateMetricChartActionOptions();
              await browser.pressKeys(browser.keys.ESCAPE);
            });
          });
        });

        describe('Logs Tab', () => {
          before(async () => {
            await browser.scrollTop();
            await pageObjects.infraHostsView.visitLogsTab();
          });

          after(async () => {
            await browser.scrollTop();
          });

          it('should load the Logs tab section when clicking on it', async () => {
            await testSubjects.existOrFail('hostsView-logs');
          });

          it('should load the Logs tab with the right columns', async () => {
            await retry.try(async () => {
              const columnLabels = await pageObjects.infraHostsView.getLogsTableColumnHeaders();

              expect(columnLabels).to.eql(['Timestamp', 'host.name', 'Message']);
            });
          });
        });

        describe('Alerts Tab', () => {
          const ACTIVE_ALERTS = 6;
          const RECOVERED_ALERTS = 4;
          const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
          const COLUMNS = 11;

          before(async () => {
            await browser.scrollTop();
            await pageObjects.infraHostsView.visitAlertTab();
          });

          after(async () => {
            await browser.scrollTop();
          });

          it('should correctly load the Alerts tab section when clicking on it', async () => {
            await testSubjects.existOrFail('hostsView-alerts');
          });

          it('should correctly render a badge with the active alerts count', async () => {
            const alertsCount = await pageObjects.infraHostsView.getAlertsCount();

            expect(alertsCount).to.be('6');
          });

          describe('#FilterButtonGroup', () => {
            it('can be filtered to only show "all" alerts using the filter button', async () => {
              await pageObjects.infraHostsView.setAlertStatusFilter();
              await retry.try(async () => {
                const tableRows = await observability.alerts.common.getTableCellsInRows();
                expect(tableRows.length).to.be(ALL_ALERTS);
              });
            });

            it('can be filtered to only show "active" alerts using the filter button', async () => {
              await pageObjects.infraHostsView.setAlertStatusFilter(ALERT_STATUS_ACTIVE);
              await retry.try(async () => {
                const tableRows = await observability.alerts.common.getTableCellsInRows();
                expect(tableRows.length).to.be(ACTIVE_ALERTS);
              });
            });

            it('can be filtered to only show "recovered" alerts using the filter button', async () => {
              await pageObjects.infraHostsView.setAlertStatusFilter(ALERT_STATUS_RECOVERED);
              await retry.try(async () => {
                const tableRows = await observability.alerts.common.getTableCellsInRows();
                expect(tableRows.length).to.be(RECOVERED_ALERTS);
              });
            });
          });

          describe('#AlertsTable', () => {
            it('should correctly render', async () => {
              await observability.alerts.common.getTableOrFail();
            });

            it('should renders the correct number of cells', async () => {
              await pageObjects.infraHostsView.setAlertStatusFilter();
              await retry.try(async () => {
                const cells = await observability.alerts.common.getTableCells();
                expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
              });
            });
          });
        });

        describe('Search Query', () => {
          const filtererEntries = tableEntries.slice(0, 3);

          const query = filtererEntries.map((entry) => `host.name :"${entry.title}"`).join(' or ');

          before(async () => {
            await browser.scrollTop();
            await pageObjects.infraHostsView.submitQuery(query);
            await await waitForPageToLoad();
          });

          after(async () => {
            await browser.scrollTop();
            await pageObjects.infraHostsView.submitQuery('');
          });

          it('should filter the table content on a search submit', async () => {
            const hostRows = await pageObjects.infraHostsView.getHostsTableData();

            expect(hostRows.length).to.equal(3);

            for (let i = 0; i < hostRows.length; i++) {
              const hostRowData = await pageObjects.infraHostsView.getHostsRowData(hostRows[i]);
              expect(hostRowData).to.eql(filtererEntries[i]);
            }
          });

          it('should update the KPIs content on a search submit', async () => {
            await Promise.all(
              [
                { metric: 'hostsCount', value: '3' },
                { metric: 'cpuUsage', value: 'N/A' },
                { metric: 'normalizedLoad1m', value: '0.2%' },
                { metric: 'memoryUsage', value: '17.5%' },
                { metric: 'diskUsage', value: '35.7%' },
              ].map(async ({ metric, value }) => {
                await retry.try(async () => {
                  const tileValue =
                    metric === 'hostsCount'
                      ? await pageObjects.infraHostsView.getKPITileValue(metric)
                      : await pageObjects.assetDetails.getAssetDetailsKPITileValue(metric);
                  expect(tileValue).to.eql(value);
                });
              })
            );
          });

          it('should update the alerts count on a search submit', async () => {
            const alertsCount = await pageObjects.infraHostsView.getAlertsCount();

            expect(alertsCount).to.be('6');
          });

          it('should update the alerts table content on a search submit', async () => {
            const ACTIVE_ALERTS = 6;
            const RECOVERED_ALERTS = 4;
            const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
            const COLUMNS = 11;

            await pageObjects.infraHostsView.visitAlertTab();

            await pageObjects.infraHostsView.setAlertStatusFilter();
            await retry.try(async () => {
              const cells = await observability.alerts.common.getTableCells();
              expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
            });
          });

          it('should show an error message when an invalid KQL is submitted', async () => {
            await pageObjects.infraHostsView.submitQuery('cloud.provider="gcp" A');
            await testSubjects.existOrFail('hostsViewErrorCallout');
          });

          it('should show no data message in the table content', async () => {
            await pageObjects.infraHostsView.submitQuery('host.name : "foo"');

            await waitForPageToLoad();

            await retry.try(async () => {
              await testSubjects.exists('hostsViewTableNoData');
            });
          });
        });

        describe('Pagination and Sorting', () => {
          before(async () => {
            await browser.scrollTop();
          });

          after(async () => {
            await browser.scrollTop();
          });

          beforeEach(async () => {
            await retry.try(async () => {
              await pageObjects.infraHostsView.changePageSize(5);
            });
          });

          it('should show 5 rows on the first page', async () => {
            const hostRows = await pageObjects.infraHostsView.getHostsTableData();

            for (let i = 0; i < hostRows.length; i++) {
              const hostRowData = await pageObjects.infraHostsView.getHostsRowData(hostRows[i]);
              expect(hostRowData).to.eql(tableEntries[i]);
            }
          });

          it('should paginate to the last page', async () => {
            await pageObjects.infraHostsView.paginateTo(2);
            const hostRows = await pageObjects.infraHostsView.getHostsTableData();

            expect(hostRows.length).to.equal(1);

            const hostRowData = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
            expect(hostRowData).to.eql(tableEntries[5]);
          });

          it('should show all hosts on the same page', async () => {
            await pageObjects.infraHostsView.changePageSize(10);
            const hostRows = await pageObjects.infraHostsView.getHostsTableData();

            for (let i = 0; i < hostRows.length; i++) {
              const hostRowData = await pageObjects.infraHostsView.getHostsRowData(hostRows[i]);
              expect(hostRowData).to.eql(tableEntries[i]);
            }
          });

          it('should sort by a numeric field asc', async () => {
            await pageObjects.infraHostsView.sortByMemoryUsage();
            let hostRows = await pageObjects.infraHostsView.getHostsTableData();
            const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
            expect(hostDataFirtPage).to.eql(tableEntries[3]);

            await pageObjects.infraHostsView.paginateTo(2);
            hostRows = await pageObjects.infraHostsView.getHostsTableData();
            const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
            expect(hostDataLastPage).to.eql(tableEntries[0]);
          });

          it('should sort by a numeric field desc', async () => {
            await pageObjects.infraHostsView.sortByMemoryUsage();
            let hostRows = await pageObjects.infraHostsView.getHostsTableData();
            const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
            expect(hostDataFirtPage).to.eql(tableEntries[0]);

            await pageObjects.infraHostsView.paginateTo(2);
            hostRows = await pageObjects.infraHostsView.getHostsTableData();
            const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
            expect(hostDataLastPage).to.eql(tableEntries[3]);
          });

          it('should sort by text field asc', async () => {
            await pageObjects.infraHostsView.sortByTitle();
            let hostRows = await pageObjects.infraHostsView.getHostsTableData();
            const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
            expect(hostDataFirtPage).to.eql(tableEntries[0]);

            await pageObjects.infraHostsView.paginateTo(2);
            hostRows = await pageObjects.infraHostsView.getHostsTableData();
            const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
            expect(hostDataLastPage).to.eql(tableEntries[2]);
          });

          it('should sort by text field desc', async () => {
            await pageObjects.infraHostsView.sortByTitle();
            let hostRows = await pageObjects.infraHostsView.getHostsTableData();
            const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
            expect(hostDataFirtPage).to.eql(tableEntries[2]);

            await pageObjects.infraHostsView.paginateTo(2);
            hostRows = await pageObjects.infraHostsView.getHostsTableData();
            const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
            expect(hostDataLastPage).to.eql(tableEntries[0]);
          });
        });
      });

      describe('#Permissions: Read Only User - Single Host Flyout', () => {
        describe('Dashboards Tab', () => {
          before(async () => {
            await setCustomDashboardsEnabled(true);
            await loginWithReadOnlyUserAndNavigateToHostsFlyout();
            await pageObjects.assetDetails.clickDashboardsTab();
          });

          after(async () => {
            await retry.try(async () => {
              await pageObjects.infraHome.clickCloseFlyoutButton();
            });
            await logoutAndDeleteReadOnlyUser();
          });

          it('should render dashboards tab splash screen with disabled option to add dashboard', async () => {
            await pageObjects.assetDetails.addDashboardExists();
            const elementToHover = await pageObjects.assetDetails.getAddDashboardButton();
            await retry.try(async () => {
              await elementToHover.moveMouseTo();
              await testSubjects.existOrFail('infraCannotAddDashboardTooltip');
            });
          });

          it('should not render dashboards tab if the feature is disabled', async () => {
            await setCustomDashboardsEnabled(false);
            await pageObjects.assetDetails.clickOverviewTab();
            await browser.refresh();
            await !pageObjects.assetDetails.dashboardsTabExists();
          });
        });
      });
    });
  });
};
