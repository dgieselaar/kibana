/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { take } from 'lodash';
import { Required } from 'utility-types';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { getInitialColumnsForLogs } from '../../util/get_initial_columns_for_logs';
import { Entity, EntityTypeDefinition } from '../../../common/entities';
import { ControlledEsqlChart } from '../esql_chart/controlled_esql_chart';
import { ControlledEsqlGrid } from '../esql_grid/controlled_esql_grid';

export function EntityOverview({
  entity,
  typeDefinition,
}: {
  entity: Entity<Record<string, any>>;
  typeDefinition: Required<EntityTypeDefinition, 'discoveryDefinition'>;
}) {
  const { start, end } = useMemo(() => {
    const endM = moment();
    return {
      start: moment(endM).subtract(60, 'minutes').valueOf(),
      end: endM.valueOf(),
    };
  }, []);

  const baseQuery = `FROM ${typeDefinition.discoveryDefinition.indexPatterns
    .map((pattern) => `"${pattern}"`)
    .join(',')} | WHERE ${typeDefinition.discoveryDefinition.identityFields
    .map(({ field }) => {
      const value = entity.properties[field];
      if (value === null || value === undefined) {
        return `"${field}" IS NULL`;
      }
      return [`${field}`, '==', typeof value === 'string' ? `"${value}"` : value].join(' ');
    })
    .join(' AND ')}`;

  const logsQuery = `${baseQuery} | LIMIT 100`;

  const logsQueryResult = useEsqlQueryResult({ query: logsQuery, start, end });

  const histogramQuery = `${baseQuery} | STATS count = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1 minute)`;

  const histogramQueryResult = useEsqlQueryResult({ query: histogramQuery, start, end });

  const columnAnalysis = useMemo(() => {
    if (logsQueryResult.value) {
      return getInitialColumnsForLogs({
        datatable: logsQueryResult.value,
      });
    }
    return undefined;
  }, [logsQueryResult]);

  return (
    <EuiFlexGroup direction="column">
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.inventory.entityOverview.logRateChartTitle', {
                defaultMessage: 'Log rate',
              })}
            </h3>
          </EuiTitle>
          <ControlledEsqlChart
            result={histogramQueryResult}
            id="entity_log_rate"
            metricNames={['count']}
            height={200}
            chartType="bar"
          />
        </EuiFlexGroup>
      </EuiPanel>
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          {columnAnalysis?.constants.length ? (
            <>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.inventory.entityOverview.h3.constantsLabel', {
                      defaultMessage: 'Constants',
                    })}
                  </h3>
                </EuiTitle>
                <EuiFlexGroup direction="row" wrap gutterSize="xs">
                  {take(columnAnalysis.constants, 10).map((constant) => (
                    <EuiBadge color="hollow" key={constant.name}>{`${constant.name}:${
                      constant.value === '' || constant.value === 0 ? '(empty)' : constant.value
                    }`}</EuiBadge>
                  ))}
                  {columnAnalysis.constants.length > 10 ? (
                    <EuiText size="xs">
                      {i18n.translate('xpack.inventory.entityOverview.moreTextLabel', {
                        defaultMessage: '{overflowCount} more',
                        values: {
                          overflowCount: columnAnalysis.constants.length - 20,
                        },
                      })}
                    </EuiText>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexGroup>
            </>
          ) : null}
          <ControlledEsqlGrid
            query={logsQuery}
            result={logsQueryResult}
            initialColumns={columnAnalysis?.initialColumns}
          />
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexGroup>
  );
}
