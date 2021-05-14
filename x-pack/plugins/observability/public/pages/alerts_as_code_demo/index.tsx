/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCard,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { isLeft } from 'fp-ts/lib/Either';
import React, { useCallback, useEffect, useState } from 'react';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { PreviewComponent } from './preview_component';
import { Template, templates } from './templates';

export function AlertsAsCodeDemoPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<
    { template: Template; values: Record<string, any> } | undefined
  >();

  const [previewVisible, setPreviewVisible] = useState(false);

  const onChange = useCallback(
    (values: Record<string, any>) => {
      setSelectedTemplate((state) => {
        return state?.template
          ? {
              ...state,
              values,
            }
          : undefined;
      });
    },
    [setSelectedTemplate]
  );

  const validation = selectedTemplate?.template.type.decode(selectedTemplate?.values);

  const errors = validation && isLeft(validation) ? validation.left : [];

  const valid = errors.length === 0;

  const config =
    selectedTemplate && valid
      ? selectedTemplate.template.toRawTemplate(selectedTemplate.values)
      : undefined;

  const convertToFreeForm = () => {
    setSelectedTemplate((prev) => ({
      template: templates.find((template) => template.id === 'free-form')!,
      values: {
        ruleName: prev?.values.ruleName,
        config: prev?.template.toRawTemplate(prev.values),
      },
    }));
  };

  function selectTemplate(template: Template) {
    setSelectedTemplate({
      template,
      values: {
        ruleName: template.title,
        ...(template.defaults?.() ?? {}),
      },
    });
  }

  useEffect(() => {
    selectTemplate(templates[0]);
  }, []);

  return (
    <>
      <EuiPageTemplate
        pageHeader={{
          children: (
            <>
              Create metric-based rules and alerts with a template or manually configure it
              yourself.
            </>
          ),
          pageTitle: (
            <>
              Metric rules <ExperimentalBadge />
            </>
          ),
          rightSideItems: [
            <EuiLink
              target="_blank"
              href="https://gist.github.com/dgieselaar/d512d97d6e1040ad2dac29d73fe511d4"
            >
              About
            </EuiLink>,
          ],
        }}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiPanel paddingSize="m">
              <EuiTitle>
                <h3>Choose template</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGrid columns={4}>
                {templates.map((template) => (
                  <EuiFlexItem key={template.id} grow>
                    <EuiCard
                      description={template.description}
                      title={template.title}
                      titleSize="s"
                      icon={<EuiIcon size="l" type={template.icon} />}
                      layout="horizontal"
                      paddingSize="l"
                      selectable={{
                        onClick: () => {
                          selectTemplate(template);
                        },
                        isSelected: selectedTemplate?.template.id === template.id,
                      }}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGrid>
            </EuiPanel>
          </EuiFlexItem>

          {selectedTemplate ? (
            <>
              <EuiFlexItem>
                <EuiPanel paddingSize="m">
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
                        These are the settings needed to configure {selectedTemplate.template.title}
                        .
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
                        <EuiSpacer size="m" />
                        <selectedTemplate.template.Form
                          values={selectedTemplate.values}
                          onChange={onChange}
                        />
                        <EuiSpacer size="m" />
                        <EuiFormRow fullWidth>
                          <EuiFlexGroup direction="row" justifyContent="flexEnd">
                            {selectedTemplate.template.id !== 'free-form' && (
                              <EuiFlexItem grow={false}>
                                <EuiButtonEmpty
                                  disabled={!config}
                                  type="button"
                                  iconType="snowflake"
                                  onClick={convertToFreeForm}
                                >
                                  Convert to free-form
                                </EuiButtonEmpty>
                              </EuiFlexItem>
                            )}
                            <EuiFlexItem grow={false}>
                              <EuiButton
                                fill={true}
                                disabled={!config}
                                type="button"
                                iconType="play"
                                onClick={() => setPreviewVisible(true)}
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
      </EuiPageTemplate>
      {previewVisible && (
        <EuiFlyout
          onClose={() => {
            setPreviewVisible(false);
          }}
          size="l"
        >
          <EuiFlyoutHeader>
            <EuiTitle>
              <h1>Preview</h1>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <PreviewComponent config={config} />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton fill={true} onClick={() => setPreviewVisible(false)}>
                  Close
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
}
