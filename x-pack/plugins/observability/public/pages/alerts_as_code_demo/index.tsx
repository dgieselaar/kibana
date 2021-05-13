/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModalBody } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiModalHeader } from '@elastic/eui';
import {
  EuiButton,
  EuiCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiModal,
} from '@elastic/eui';
import { isLeft } from 'fp-ts/lib/Either';
import React, { useState } from 'react';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { useTheme } from '../../hooks/use_theme';
import { PreviewComponent } from './preview_component';
import { Template, templates } from './templates';

export function AlertsAsCodeDemoPage() {
  const theme = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<
    { template: Template; values: Record<string, any> } | undefined
  >({ template: templates[1], values: {} });

  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const onChange = (values: Record<string, any>) => {
    setSelectedTemplate((state) => {
      return state?.template
        ? {
            ...state,
            values,
          }
        : undefined;
    });
  };

  const validation = selectedTemplate?.template.type.decode(selectedTemplate?.values);

  const errors = validation && isLeft(validation) ? validation.left : [];

  const valid = errors.length === 0;

  const config =
    selectedTemplate && valid
      ? selectedTemplate.template.toRawTemplate(selectedTemplate.values)
      : undefined;

  return (
    <>
      <EuiPage restrictWidth>
        <EuiPageBody>
          <EuiPageHeader
            bottomBorder
            paddingSize="l"
            css={`
               {
                margin: 0;
                padding-bottom: ${theme.eui.paddingSizes.l};
              }
            `}
            pageTitle={
              <>
                Metric rules <ExperimentalBadge />
              </>
            }
          >
            Create metric-based rules and alerts with a template or manually configure it yourself.
          </EuiPageHeader>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiPanel paddingSize="l">
                <EuiFlexGroup direction="column" gutterSize="none">
                  <EuiTitle>
                    <h3>Choose template</h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText>Templates that are available to use.</EuiText>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup>
                  {templates.map((template) => (
                    <EuiFlexItem key={template.id}>
                      <EuiCard
                        description={template.description}
                        title={template.title}
                        icon={<EuiIcon size="xxl" type={template.icon} />}
                        selectable={{
                          onClick: () => {
                            setSelectedTemplate({ template, values: {} });
                          },
                          isSelected: selectedTemplate?.template.id === template.id,
                        }}
                      />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>

            {selectedTemplate ? (
              <>
                <EuiFlexItem>
                  <EuiPanel paddingSize="l">
                    <EuiFlexGroup direction="column" gutterSize="none">
                      <EuiFlexItem>
                        <EuiTitle>
                          <h3>
                            <EuiIcon size="xl" type={selectedTemplate.template.icon} />
                            <span style={{ marginLeft: '1rem', verticalAlign: 'bottom' }}>
                              Configure {selectedTemplate.template.title}
                            </span>
                          </h3>
                        </EuiTitle>
                        <EuiSpacer size="s" />
                        <EuiText>
                          These are the settings needed to configure{' '}
                          {selectedTemplate.template.title}.
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiSpacer size="m" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiForm>
                          <EuiFormRow label="Rule name" helpText="Give the rule a name">
                            <EuiFieldText
                              value={selectedTemplate.values.ruleName ?? ''}
                              onChange={(e) => {
                                onChange({
                                  ...selectedTemplate.values,
                                  ruleName: e.target.value,
                                });
                              }}
                            />
                          </EuiFormRow>
                          <selectedTemplate.template.Form
                            values={selectedTemplate.values}
                            onChange={onChange}
                          />
                          <EuiFormRow fullWidth>
                            <EuiFlexGroup direction="row" justifyContent="flexEnd">
                              <EuiFlexItem grow={false}>
                                <EuiButtonEmpty disabled={!config} type="button" iconType="pencil">
                                  Convert to free-form
                                </EuiButtonEmpty>
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <EuiButton
                                  disabled={!config}
                                  type="button"
                                  iconType="play"
                                  onClick={() => setPreviewModalVisible(true)}
                                >
                                  Preview rule
                                </EuiButton>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFormRow>
                        </EuiForm>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              </>
            ) : null}
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
      {previewModalVisible && (
        <EuiModal
          maxWidth={false}
          onClose={() => {
            setPreviewModalVisible(false);
          }}
        >
          <EuiModalBody>
            <PreviewComponent config={config} />
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
}
