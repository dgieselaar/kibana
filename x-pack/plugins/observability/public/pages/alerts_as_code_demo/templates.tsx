/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiComboBox } from '@elastic/eui';
import { EuiFieldNumber } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import * as t from 'io-ts';
import React from 'react';
import type { AlertingConfig } from '../../../../apm/common/rules/alerting_dsl/alerting_dsl_rt';
import { QueryInput } from './query_input';
import { useIndexPatterns } from './use_index_patterns';

const SERVICE_NAME = 'service.name';

export interface Template<TType extends t.Mixed = t.Mixed> {
  id: string;
  type: TType;
  icon: EuiIconType;
  title: string;
  description: string;
  form: (options: {
    values: Partial<t.TypeOf<TType>>;
    onChange: (values: Partial<t.TypeOf<TType>>) => void;
  }) => React.ReactNode;
  toRawTemplate: (props: t.TypeOf<TType>) => AlertingConfig;
}

function createTemplate<TType extends t.Mixed>(template: Template<TType>): Template<TType> {
  return template;
}

export const templates: Array<Template<any>> = [
  createTemplate({
    id: 'apdex_score',
    title: 'Apdex score',
    description: 'User satisfaction score based on latency thresholds.',
    type: t.type({
      ruleName: t.string,
      latencyThreshold: t.number,
      window: t.number,
    }),
    icon: 'faceHappy',
    form: ({ values, onChange }) => {
      return (
        <>
          <EuiFormRow
            label="Set latency threshold"
            helpText="The apdex score is defined by the latency threshold set"
          >
            <EuiFieldNumber
              value={values.latencyThreshold ?? ''}
              onChange={(e) => {
                onChange({
                  ...values,
                  latencyThreshold: e.target.valueAsNumber,
                });
              }}
              append="ms"
            />
          </EuiFormRow>

          <EuiFormRow
            label="Set interval"
            helpText="Define the window over which the apdex score should be measured"
          >
            <EuiFieldNumber
              value={values.window ?? ''}
              onChange={(e) => {
                onChange({
                  ...values,
                  window: isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber,
                });
              }}
              append="mins"
            />
          </EuiFormRow>
        </>
      );
    },
    toRawTemplate: (props) => {
      const range = `${props.window}m` as const;
      const satisfied = `satisfied_count_${range}` as const;
      const tolerated = `tolerated_count_${range}`;
      const score = `apdex_score_${range}`;
      const total = `total_count_${range}`;
      const thresholdUs = props.latencyThreshold * 1000;

      return {
        step: '1m',
        query: {
          index: ['apm-*', 'traces-apm*'],
          filter: 'transaction.type:page-load or transaction.type:request',
          metrics: {
            [satisfied]: {
              count_over_time: {
                range,
                filter: `transaction.duration.us<=${thresholdUs}`,
              },
              record: true,
            },
            [tolerated]: {
              count_over_time: {
                range,
                filter: `transaction.duration.us>${thresholdUs} and transaction.duration.us<=${thresholdUs}`,
              },
              record: true,
            },
            [total]: {
              count_over_time: {
                range,
              },
              record: true,
            },
            [score]: {
              expression: `(${satisfied} + (${tolerated} / 2)) / ${total}`,
              record: true,
            },
          },
          by: {
            [SERVICE_NAME]: {
              field: SERVICE_NAME,
            },
          },
          query_delay: '30s',
        },
        alert: {},
      };
    },
  }),
  createTemplate({
    id: 'slo',
    title: 'Service Level Objective',
    description: 'Define and alert on service level objectives.',
    icon: 'stats',
    type: t.type({
      index: t.array(t.string),
      allFilter: t.string,
      onTargetFilter: t.string,
    }),
    form: ({ values, onChange }) => {
      const { indexPatterns } = useIndexPatterns(values.index ?? []);

      return (
        <>
          <EuiFormRow label="Source index" helpText="The index to query for">
            <EuiComboBox
              compressed
              selectedOptions={(values.index ?? []).map((index) => ({
                label: index,
              }))}
              onChange={(options) => {
                onChange({
                  ...values,
                  index: options.map((option) => option.label),
                });
              }}
              onCreateOption={(index) => {
                onChange({
                  ...values,
                  index: (values.index ?? []).concat(index),
                });
              }}
              noSuggestions
            />
          </EuiFormRow>

          <EuiFormRow label="All events" helpText="Select all events in scope">
            <QueryInput
              placeholder="Query"
              indexPatterns={indexPatterns}
              value={values.allFilter ?? ''}
              onChange={(filter) => {
                onChange({
                  ...values,
                  allFilter: filter,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Events on target" helpText="Events in scope that are on target">
            <QueryInput
              placeholder="Query"
              indexPatterns={indexPatterns}
              value={values.onTargetFilter ?? ''}
              onChange={(filter) => {
                onChange({
                  ...values,
                  onTargetFilter: filter,
                });
              }}
            />
          </EuiFormRow>
        </>
      );
    },
    toRawTemplate: (props) => {
      return {
        step: '1m',
        query: {
          index: props.index,
          filter: props.allFilter,
          query_delay: '5s',
          metrics: {
            slo_count_on_target_5m: {
              count_over_time: {
                range: '5m',
                filter: props.onTargetFilter,
              },
            },
            slo_count_all_5m: {
              count_over_time: {
                range: '5m',
              },
            },
            slo_count_on_target_30m: {
              count_over_time: {
                range: '30m',
                filter: props.onTargetFilter,
              },
            },
            slo_count_all_30m: {
              count_over_time: {
                range: '30m',
              },
            },
            slo_count_on_target_1h: {
              count_over_time: {
                range: '1h',
                filter: props.onTargetFilter,
              },
            },
            slo_count_all_1h: {
              count_over_time: {
                range: '1h',
              },
            },
            slo_count_on_target_2h: {
              count_over_time: {
                range: '2h',
                filter: props.onTargetFilter,
              },
            },
            slo_count_all_2h: {
              count_over_time: {
                range: '2h',
              },
            },
            slo_count_on_target_6h: {
              count_over_time: {
                range: '6h',
                filter: props.onTargetFilter,
              },
            },
            slo_count_all_6h: {
              count_over_time: {
                range: '6h',
              },
            },
            slo_count_on_target_1d: {
              count_over_time: {
                range: '1d',
                filter: props.onTargetFilter,
              },
            },
            slo_count_all_1d: {
              count_over_time: {
                range: '1d',
              },
            },
            slo_count_on_target_3d: {
              count_over_time: {
                range: '3d',
                filter: props.onTargetFilter,
              },
            },
            slo_count_all_3d: {
              count_over_time: {
                range: '3d',
              },
            },
            slo_target_5m: {
              expression:
                '1 - (slo_count_on_target_5m / (slo_count_all_5m + slo_count_on_target_5m))',
              record: true,
            },
            slo_target_30m: {
              expression:
                '1 - (slo_count_on_target_30m / (slo_count_all_30m + slo_count_on_target_30m))',
              record: true,
            },
            slo_target_1h: {
              expression:
                '1- (slo_count_on_target_1h / (slo_count_all_1h + slo_count_on_target_1h))',
              record: true,
            },
            slo_target_2h: {
              expression:
                '1 - (slo_count_on_target_2h / (slo_count_all_2h + slo_count_on_target_2h))',
              record: true,
            },
            slo_target_6h: {
              expression:
                '1 - (slo_count_on_target_6h / (slo_count_all_6h + slo_count_on_target_6h))',
              record: true,
            },
            slo_target_1d: {
              expression:
                '1 - (slo_count_on_target_1d / (slo_count_all_1d + slo_count_on_target_1d))',
              record: true,
            },
            slo_target_3d: {
              expression:
                '1 - (slo_count_on_target_3d / (slo_count_all_3d + slo_count_on_target_3d))',
              record: true,
            },
          },
        },
        alert: {},
      };
    },
  }),
];
