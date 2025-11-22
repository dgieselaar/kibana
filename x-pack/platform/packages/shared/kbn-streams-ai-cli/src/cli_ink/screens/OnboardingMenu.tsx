/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Menu, type MenuItem } from '../components/Menu';

interface OnboardingMenuProps {
  onSelectWorkflow: (workflowId: string) => void;
  onBack: () => void;
}

export function OnboardingMenu({ onSelectWorkflow, onBack }: OnboardingMenuProps) {
  const items: MenuItem[] = [
    {
      label: 'Full flow',
      value: 'full-flow',
      description: 'Run complete onboarding workflow',
    },
    {
      label: 'Description',
      value: 'description',
      description: 'Generate stream description',
    },
    {
      label: 'Processing',
      value: 'processing',
      description: 'Suggest ingest processors',
    },
    {
      label: 'NL Queries',
      value: 'nl-queries',
      description: 'Generate natural language queries',
    },
    {
      label: 'Anomaly detection',
      value: 'anomaly-detection',
      description: 'Generate anomaly detection jobs',
    },
    {
      label: 'Dashboards',
      value: 'dashboards',
      description: 'Recommend dashboards',
    },
    {
      label: 'Rules',
      value: 'rules',
      description: 'Generate detection rules',
    },
    {
      label: 'SLOs',
      value: 'slos',
      description: 'Recommend SLO definitions',
    },
    {
      label: 'Field definitions',
      value: 'field-definitions',
      description: 'Define field mappings',
    },
  ];

  return <Menu items={items} onSelect={onSelectWorkflow} onBack={onBack} title="Onboard Stream" />;
}
