/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiPortal,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { useFetcher } from '../../../../hooks/useFetcher';
import { callApmApi } from '../../../../services/rest/createCallApmApi';
import {
  Segment,
  SegmentMetricType,
  userAnalyticsConfig,
} from '../../../../../common/user_analytics';
import { px } from '../../../../style/variables';
import { EQLCodeEditorSuggestionType } from './eql_code_editor/constants';
import { LazilyLoadedEQLCodeEditor } from './eql_code_editor/lazily_loaded_code_editor';

interface Props {
  onClose: () => void;
  isOpen: boolean;
  segment: Segment | null;
  onSubmit: (values: {
    title: string;
    metric: SegmentMetricType;
    eql: string;
  }) => Promise<any>;
}

const editSegmentLabel = i18n.translate(
  'xpack.apm.userAnalyticsSegmentFlyout.titleEdit',
  { defaultMessage: 'Edit segment' }
);
const addSegmentLabel = i18n.translate(
  'xpack.apm.userAnalyticsSegmentFlyout.titleAdd',
  { defaultMessage: 'Add segment' }
);

export function UserAnalyticsSegmentFlyout({
  onClose,
  segment,
  isOpen,
  onSubmit,
}: Props) {
  const [values, setFormValues] = useState({
    title: '',
    metric: 'users' as SegmentMetricType,
    eql: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const { data: dataPlugin } = useApmPluginContext().pluginsStart;

  const { data } = useFetcher(() => {
    return callApmApi({
      endpoint: 'GET /api/apm/user_analytics/static_eql_suggestions',
    });
  }, []);

  const { indexPattern = null, eventTypes = [] } = data || {};

  useEffect(() => {
    setFormValues({
      title: segment?.title ?? '',
      metric: segment?.metric ?? 'users',
      eql: segment?.eql ?? '',
    });
  }, [
    segment?.metric,
    segment?.title,
    segment?.eql,
    // reset values when flyout opens
    isOpen,
  ]);

  if (!isOpen) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiFlyout onClose={onClose} size="s">
        <EuiFlyoutHeader hasBorder aria-labelledby="segment-flyout">
          <EuiTitle>
            <h2>{segment ? editSegmentLabel : addSegmentLabel}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiForm>
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.apm.userAnalyticsSegmentFlyout.editTitleLabel',
                { defaultMessage: 'Title' }
              )}
            >
              <EuiFieldText
                value={values.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormValues((vals) => ({
                    ...vals,
                    title,
                  }));
                }}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.apm.userAnalyticsSegmentFlyout.editMetricLabel',
                { defaultMessage: 'Metric' }
              )}
            >
              <EuiSelect
                value={values.metric}
                onChange={(e) => {
                  const metric = e.target.value as SegmentMetricType;
                  setFormValues((vals) => ({
                    ...vals,
                    metric,
                  }));
                }}
                options={Object.keys(userAnalyticsConfig.metrics).map((key) => {
                  const metric =
                    userAnalyticsConfig.metrics[key as SegmentMetricType];
                  return {
                    text: metric.title,
                    value: key,
                  };
                })}
              />
            </EuiFormRow>
            <EuiSpacer />
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.apm.userAnalyticsSegmentFlyout.editEqlLabel',
                { defaultMessage: 'EQL' }
              )}
              helpText={i18n.translate(
                'xpack.apm.userAnalyticsSegmentFlyout.eqlHelpLabel',
                {
                  defaultMessage:
                    'EQL lets you express relationships between events. You can use it to filter sessions based on a sequence of events.',
                }
              )}
            >
              <LazilyLoadedEQLCodeEditor
                value={values.eql}
                width="100%"
                height={px(200)}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  wrap: true,
                }}
                getSuggestions={async (request) => {
                  if (request.type === EQLCodeEditorSuggestionType.EventType) {
                    return eventTypes;
                  }

                  if (request.type === EQLCodeEditorSuggestionType.Field) {
                    return indexPattern
                      ? indexPattern.fields
                          .filter((field) => field.searchable)
                          .map((field) => field.name)
                      : [];
                  }

                  if (
                    request.type === EQLCodeEditorSuggestionType.Value &&
                    'getValueSuggestions' in dataPlugin.autocomplete &&
                    indexPattern
                  ) {
                    const indexPatternField = indexPattern.fields.find(
                      (field) => field.name === request.field
                    );

                    if (!indexPatternField) {
                      return [];
                    }

                    const suggestions: string[] =
                      (await dataPlugin.autocomplete.getValueSuggestions({
                        indexPattern,
                        field: indexPatternField,
                        query: '',
                        useTimeRange: true,
                      })) || [];

                    return suggestions;
                  }

                  return [];
                }}
                onChange={(eql) => {
                  setFormValues((vals) => ({
                    ...vals,
                    eql,
                  }));
                }}
                placeholder={i18n.translate(
                  'xpack.apm.userAnalyticsSegmentFlyout.eqlPlaceholder',
                  { defaultMessage: 'sequence by session.id' }
                )}
              />
            </EuiFormRow>
            <EuiFormRow fullWidth>
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    type="submit"
                    fill
                    isLoading={isLoading}
                    disabled={!values.title}
                    onClick={() => {
                      setIsLoading(true);
                      onSubmit({
                        title: values.title,
                        metric: values.metric,
                        eql: values.eql,
                      })
                        .then(() => {
                          onClose();
                        })
                        .finally(() => {
                          setIsLoading(false);
                        });
                    }}
                  >
                    {segment ? editSegmentLabel : addSegmentLabel}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiForm>
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
