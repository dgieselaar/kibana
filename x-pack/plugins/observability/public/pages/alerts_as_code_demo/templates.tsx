/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFieldNumber } from '@elastic/eui';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import * as t from 'io-ts';
import React from 'react';
import type { AlertingConfig } from '../../../../apm/common/rules/alerting_dsl/alerting_dsl_rt';

const SERVICE_NAME = 'service.name';

export interface Template<TType extends t.Mixed = t.Mixed> {
  id: string;
  type: TType;
  icon: EuiIconType;
  title: string;
  description: string;
  form: (options: {
    values: t.TypeOf<TType>;
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
          <EuiFormRow label="Rule name" helpText="Give the rule a name">
            <EuiFieldText
              value={values.ruleName ?? ''}
              onChange={(e) => {
                onChange({
                  ...values,
                  ruleName: e.target.value,
                });
              }}
            />
          </EuiFormRow>

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
];
