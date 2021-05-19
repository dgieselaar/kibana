/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSelect } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiSelectOption } from '@elastic/eui';
import { EuiSuperSelect } from '@elastic/eui';
import { EuiSuperSelectOption } from '@elastic/eui';
import { EuiHealth } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import * as t from 'io-ts';
import React from 'react';
import { AlertSeverityLevel } from '../../../../apm/public';
import { MetricAlertTrigger } from './metric_alert_trigger';

export const triggerRt = t.type({
  expression: t.string,
  severity: t.string,
});

export type Trigger = t.TypeOf<typeof triggerRt>;

const severityOptions: Array<EuiSuperSelectOption<string>> = [
  {
    value: AlertSeverityLevel.Warning,
    inputDisplay: (
      <EuiHealth color="warning" style={{ lineHeight: 'inherit' }}>
        Warning
      </EuiHealth>
    ),
  },
  {
    value: AlertSeverityLevel.Critical,
    inputDisplay: (
      <EuiHealth color="danger" style={{ lineHeight: 'inherit' }}>
        Critical
      </EuiHealth>
    ),
  },
];

export function TriggerList({
  value,
  fields,
  onChange,
}: {
  value: Trigger[];
  fields: string[];
  onChange: (triggers: Trigger[]) => void;
}) {
  return (
    <EuiFlexGroup direction="column">
      {value.map((trigger, index) => {
        return (
          <EuiFlexItem key={index}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={true}>
                <MetricAlertTrigger
                  value={trigger.expression}
                  fields={fields}
                  onChange={(expression) => {
                    onChange(
                      value.map((item) =>
                        item !== trigger
                          ? item
                          : {
                              ...trigger,
                              expression,
                            }
                      )
                    );
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: 144 }}>
                <EuiSuperSelect
                  options={severityOptions}
                  valueOfSelected={trigger.severity}
                  onChange={(severity) => {
                    onChange(
                      value.map((item) =>
                        item !== trigger
                          ? item
                          : {
                              ...trigger,
                              severity,
                            }
                      )
                    );
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="minusInCircle"
                  onClick={() => {
                    onChange(value.filter((item) => trigger !== item));
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
      <EuiFlexItem key="add" grow={false}>
        <div>
          <EuiButtonEmpty
            iconType="plusInCircle"
            onClick={() => {
              onChange(value.concat({ expression: '', severity: AlertSeverityLevel.Warning }));
            }}
          >
            Add trigger
          </EuiButtonEmpty>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
