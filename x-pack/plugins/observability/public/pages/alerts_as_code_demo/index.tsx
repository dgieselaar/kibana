/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPage } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiFlexGrid } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiPageHeader, EuiPageBody } from '@elastic/eui';
import React, { useState } from 'react';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { useTheme } from '../../hooks/use_theme';
import { templates, Template } from './templates';

export function AlertsAsCodeDemoPage() {
  const theme = useTheme();

  const [selectedTemplate, setSelectedTemplate] = useState<Template | undefined>();
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
        <EuiFlexGroup>
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
                          {template !== selectedTemplate ? (
                            <EuiButton
                              onClick={() => {
                                setSelectedTemplate(template);
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
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}
