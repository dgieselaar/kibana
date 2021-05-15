/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { toJsonSchema } from '@kbn/io-ts-utils/target/to_json_schema';
import { monaco } from '@kbn/monaco';
import * as t from 'io-ts';
import React, { ComponentType, useEffect, useState } from 'react';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';
import { AlertingConfig, configRt } from '../../../common/rules/alerting_dsl/alerting_dsl_rt';
import { GroupBySelect } from './group_by_select';
import { IndexSelect } from './index_select';
import { QueryInput } from './query_input';
import { useIndexPatterns } from './use_index_patterns';

const MODEL_URI = monaco.Uri.parse('elastic://alerting-dsl.json');
const SCHEMA_URI = 'https://elastic.co/alerting-dsl-schema.json';

const schema = toJsonSchema(configRt);

monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
  validate: true,
  schemas: [
    ...(monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas ?? []),
    {
      uri: SCHEMA_URI,
      fileMatch: [MODEL_URI.toString()],
      schema,
    },
  ],
});

const model = monaco.editor.createModel('{\n}\n', 'json', MODEL_URI);

const SERVICE_NAME = 'service.name';

function toBy(groups: string[]) {
  return groups.length
    ? {
        by: Object.fromEntries(
          groups.map((group) => {
            return [group, { field: group }];
          })
        ),
      }
    : {};
}

export interface Template<TType extends t.Mixed = t.Mixed> {
  id: string;
  type: TType;
  icon: EuiIconType;
  title: string;
  description: string;
  Form: ComponentType<{
    values: Partial<t.TypeOf<TType>>;
    onChange: (values: Partial<t.TypeOf<TType>>) => void;
  }>;
  defaults?: () => Partial<t.TypeOf<TType>>;
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
      index: t.array(t.string),
      groupBy: t.array(t.string),
      filter: t.string,
      latencyThreshold: t.number,
      window: t.number,
      threshold: t.number,
    }),
    icon: 'faceHappy',
    defaults: () => ({
      index: ['apm-*'],
      filter: '',
      groupBy: ['service.name'],
      latencyThreshold: 500,
      window: 10,
      trigger: 0.9,
    }),
    Form: ({ values, onChange }) => {
      const { indexPatterns } = useIndexPatterns(values.index ?? []);

      return (
        <>
          <EuiFormRow label="Index" helpText="The indices to search">
            <IndexSelect
              value={values.index ?? []}
              onChange={(index) => {
                onChange({
                  ...values,
                  index,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Filter" helpText="Filter to apply to the search">
            <QueryInput
              placeholder="Filter"
              indexPatterns={indexPatterns}
              value={values.filter ?? ''}
              onChange={(filter) => {
                onChange({
                  ...values,
                  filter,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Grouping" helpText="Fields to group by">
            <GroupBySelect
              indexPatterns={indexPatterns}
              value={values.groupBy ?? []}
              onChange={(groupBy) => {
                onChange({
                  ...values,
                  groupBy,
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

          <EuiFormRow
            label="Alert threshold"
            helpText="Alert when the apdex score is below this threshold"
          >
            <EuiFieldNumber
              value={values.threshold ?? ''}
              onChange={(e) => {
                onChange({
                  ...values,
                  threshold: isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber,
                });
              }}
            />
          </EuiFormRow>
        </>
      );
    },
    toRawTemplate: (props) => {
      const range = `${props.window}m`;
      const satisfied = `satisfied_count`;
      const tolerated = `tolerated_count`;
      const total = `total_count`;
      const score = `apdex_score`;
      const thresholdUs = props.latencyThreshold * 1000;

      return {
        query: {
          index: props.index,
          filter:
            '(transaction.type:page-load or transaction.type:request)' +
            (props.filter ? `and (${props.filter})` : ''),
          ...toBy(props.groupBy),
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
        alert: {
          expression: `apdex_score <= ${props.threshold}`,
        },
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
      groupBy: t.array(t.string),
      allFilter: t.string,
      onTargetFilter: t.string,
    }),
    defaults: () => {
      return {
        index: ['apm-*'],
        groupBy: ['service.name'],
        allFilter: 'event.outcome:(success or failure)',
        onTargetFilter: 'event.outcome:success',
      };
    },
    Form: ({ values, onChange }) => {
      const { indexPatterns } = useIndexPatterns(values.index ?? []);

      return (
        <>
          <EuiFormRow label="Source index" helpText="The index to query for">
            <IndexSelect
              value={values.index ?? []}
              onChange={(index) => {
                onChange({
                  ...values,
                  index,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Grouping" helpText="Fields to group by">
            <GroupBySelect
              indexPatterns={indexPatterns}
              value={values.groupBy ?? []}
              onChange={(groupBy) => {
                onChange({
                  ...values,
                  groupBy,
                });
              }}
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
        query: {
          index: props.index,
          filter: props.allFilter,
          query_delay: '5s',
          ...toBy(props.groupBy),
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
        alerts: [],
      };
    },
  }),
  createTemplate({
    id: 'missing_data',
    title: 'Missing data',
    description: 'Detect and alert when an entity has stopped reporting data',
    icon: 'partial',
    type: t.type({
      index: t.array(t.string),
      filter: t.string,
      groupBy: t.array(t.string),
      lookbackWindowDays: t.number,
      evaluationWindowMinutes: t.number,
    }),
    defaults: () => {
      return {
        index: [],
        filter: '',
        groupBy: [],
        lookbackWindowDays: 30,
        evaluationWindowMinutes: 5,
      };
    },
    Form: ({ values, onChange }) => {
      const { indexPatterns } = useIndexPatterns(values.index ?? []);

      return (
        <>
          <EuiFormRow label="Index" helpText="The indices to search">
            <IndexSelect
              value={values.index ?? []}
              onChange={(index) => {
                onChange({
                  ...values,
                  index,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Filter" helpText="Filter to apply to the search">
            <QueryInput
              placeholder="Filter"
              indexPatterns={indexPatterns}
              value={values.filter ?? ''}
              onChange={(filter) => {
                onChange({
                  ...values,
                  filter,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Grouping" helpText="Fields to group by">
            <GroupBySelect
              indexPatterns={indexPatterns}
              value={values.groupBy ?? []}
              onChange={(groupBy) => {
                onChange({
                  ...values,
                  groupBy,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Lookback window" helpText="The lookback window to compare to">
            <EuiFieldNumber
              value={values.lookbackWindowDays ?? ''}
              onChange={(e) => {
                onChange({
                  ...values,
                  lookbackWindowDays: e.target.valueAsNumber,
                });
              }}
              append="days"
            />
          </EuiFormRow>

          <EuiFormRow
            label="Evaluation window"
            helpText="Which period to check for missing entities"
          >
            <EuiFieldNumber
              value={values.evaluationWindowMinutes ?? ''}
              onChange={(e) => {
                onChange({
                  ...values,
                  evaluationWindowMinutes: e.target.valueAsNumber,
                });
              }}
              append="mins"
            />
          </EuiFormRow>
        </>
      );
    },
    toRawTemplate: (props) => {
      return {
        queries: [
          {
            index: props.index,
            filter: props.filter,
            ...toBy(props.groupBy),
            query_delay: '5s',
            metrics: {
              group_document_count: {
                count_over_time: {
                  range: `${props.evaluationWindowMinutes}m`,
                },
              },
            },
          },
          {
            alerts: {
              ...toBy(props.groupBy),
              query_delay: '5s',
              metrics: {
                group_document_count_lookback: {
                  count_over_time: {
                    range: `${props.lookbackWindowDays}d`,
                  },
                },
              },
            },
          },
        ],
        metrics: {
          missing_entity_data: {
            expression: '!absent(group_document_count_lookback) && absent(group_document_count)',
          },
        },
        alerts: [],
      };
    },
  }),
  createTemplate({
    id: 'new_data',
    title: 'New data',
    description: 'Detect and alert when a new entity has been detected',
    icon: 'asterisk',
    type: t.type({
      index: t.array(t.string),
      filter: t.string,
      groupBy: t.array(t.string),
      lookbackWindowDays: t.number,
      evaluationWindowMinutes: t.number,
    }),
    defaults: () => {
      return {
        index: [],
        filter: '',
        groupBy: [],
        lookbackWindowDays: 30,
        evaluationWindowMinutes: 5,
      };
    },
    Form: ({ values, onChange }) => {
      const { indexPatterns } = useIndexPatterns(values.index ?? []);

      return (
        <>
          <EuiFormRow label="Index" helpText="The indices to search">
            <IndexSelect
              value={values.index ?? []}
              onChange={(index) => {
                onChange({
                  ...values,
                  index,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Filter" helpText="Filter to apply to the search">
            <QueryInput
              placeholder="Filter"
              indexPatterns={indexPatterns}
              value={values.filter ?? ''}
              onChange={(filter) => {
                onChange({
                  ...values,
                  filter,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Grouping" helpText="Fields to group by">
            <GroupBySelect
              indexPatterns={indexPatterns}
              value={values.groupBy ?? []}
              onChange={(groupBy) => {
                onChange({
                  ...values,
                  groupBy,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow label="Lookback window" helpText="The lookback window to compare to">
            <EuiFieldNumber
              value={values.lookbackWindowDays ?? ''}
              onChange={(e) => {
                onChange({
                  ...values,
                  lookbackWindowDays: e.target.valueAsNumber,
                });
              }}
              append="days"
            />
          </EuiFormRow>

          <EuiFormRow label="Evaluation window" helpText="Which period to check for new entities">
            <EuiFieldNumber
              value={values.evaluationWindowMinutes ?? ''}
              onChange={(e) => {
                onChange({
                  ...values,
                  evaluationWindowMinutes: e.target.valueAsNumber,
                });
              }}
              append="mins"
            />
          </EuiFormRow>
        </>
      );
    },
    toRawTemplate: (props) => {
      return {
        queries: [
          {
            index: props.index,
            filter: props.filter,
            query_delay: '5s',
            ...toBy(props.groupBy),
            metrics: {
              group_document_count: {
                count_over_time: {
                  range: `${props.evaluationWindowMinutes}m`,
                },
                record: true,
              },
            },
          },
          {
            alerts: {
              ...toBy(props.groupBy),
              query_delay: '5s',
              metrics: {
                group_document_count_lookback: {
                  count_over_time: {
                    range: `${props.lookbackWindowDays}d`,
                  },
                },
              },
            },
          },
        ],
        alert: {
          expression: 'absent(group_document_count_lookback) && !absent(group_document_count)',
        },
      };
    },
  }),
  createTemplate({
    id: 'free-form',
    title: 'Free-form',
    description: 'Free-form editing of rules',
    icon: 'snowflake',
    type: t.type({
      config: configRt,
    }),
    defaults: () => {
      return {
        config: {} as AlertingConfig,
      };
    },
    Form: ({ values, onChange }) => {
      const [text, setText] = useState(JSON.stringify(values.config ?? {}, null, 2));

      useEffect(() => {
        if (!values.config) {
          onChange({ ...values, config: {} as AlertingConfig });
        }
      }, []); // eslint-disable-line react-hooks/exhaustive-deps

      return (
        <CodeEditor
          height={350}
          languageId="json"
          options={{ model }}
          editorDidMount={() => {
            model.setValue(text);
          }}
          onChange={(value) => {
            setText(value);
            try {
              const parsed = JSON.parse(value);
              onChange({
                ...values,
                config: parsed,
              });
            } catch (e) {
              onChange({ ...values, config: {} as AlertingConfig });
            }
          }}
          value={text}
        />
      );
    },
    toRawTemplate: ({ config }) => {
      return config as AlertingConfig;
    },
  }),
];
