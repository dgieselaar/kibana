/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiButtonEmpty,
} from '@elastic/eui';
import { isLeft } from 'fp-ts/lib/Either';
import React, { useState } from 'react';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTheme } from '../../hooks/use_theme';
import { PreviewComponent } from './preview_component';
import { Template, templates } from './templates';

export function AlertsAsCodeDemoPage() {
  const theme = useTheme();

  const {} = usePluginContext();

  const [selectedTemplate, setSelectedTemplate] = useState<
    { template: Template; values: Record<string, any> } | undefined
  >({ template: templates[0], values: {} });

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
              <EuiFlexGrid columns={3}>
                {templates.map((template) => (
                  <EuiFlexItem grow={false} key={template.id} style={{ width: 320 }}>
                    <EuiPanel>
                      <EuiFlexGroup direction="column" alignItems="center">
                        <EuiSpacer size="s" />
                        <EuiFlexItem>
                          <EuiIcon type={template.icon} size="xxl" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiTitle>
                            <h3>{template.title}</h3>
                          </EuiTitle>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText textAlign="center" size="s">
                            {template.description}
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem style={{ alignSelf: 'stretch' }}>
                          {template !== selectedTemplate?.template ? (
                            <EuiButton
                              onClick={() => {
                                setSelectedTemplate({ template, values: {} });
                              }}
                            >
                              Select
                            </EuiButton>
                          ) : (
                            <EuiButton
                              iconType="checkInCircleFilled"
                              iconSide="left"
                              color="secondary"
                            >
                              Selected
                            </EuiButton>
                          )}
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGrid>
            </EuiPanel>
          </EuiFlexItem>

          {selectedTemplate ? (
            <>
              <EuiFlexItem>
                <EuiPanel paddingSize="l">
                  <EuiFlexGroup direction="column" gutterSize="none">
                    <EuiFlexItem>
                      <EuiTitle>
                        <h3>Configure {selectedTemplate.template.title}</h3>
                      </EuiTitle>
                      <EuiSpacer size="s" />
                      <EuiText>
                        These are the settings needed to configure {selectedTemplate.template.title}
                        .
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiSpacer size="m" />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiForm>
                        {selectedTemplate.template.form({
                          values: selectedTemplate.values,
                          onChange,
                        })}
                        <EuiFormRow fullWidth>
                          <EuiFlexGroup direction="row" justifyContent="flexEnd">
                            <EuiFlexItem grow={false}>
                              <EuiButtonEmpty
                                disabled={!valid}
                                type="button"
                                iconType="magnifyWithPlus"
                              >
                                <EuiText size="s">Inspect and copy JSON</EuiText>
                              </EuiButtonEmpty>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiButton disabled={!valid} type="button">
                                Convert to free-form
                              </EuiButton>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFormRow>
                      </EuiForm>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel paddingSize="l">
                  <EuiFlexGroup direction="column" gutterSize="none">
                    <EuiFlexItem>
                      <PreviewComponent config={config} />
                    </EuiFlexItem>
                    <EuiSpacer size="m" />
                    <EuiFlexItem style={{ alignSelf: 'flex-end' }}>
                      <EuiButton>Create rule</EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            </>
          ) : null}
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}
