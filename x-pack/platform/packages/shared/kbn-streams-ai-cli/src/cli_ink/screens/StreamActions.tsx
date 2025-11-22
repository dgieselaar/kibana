/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Menu, type MenuItem } from '../components/Menu';

interface StreamActionsProps {
  onNavigate: (action: string) => void;
  onBack: () => void;
}

export function StreamActions({ onNavigate, onBack }: StreamActionsProps) {
  const items: MenuItem[] = [
    {
      label: 'Describe dataset',
      value: 'describe-dataset',
      description: 'Analyze and summarize stream fields',
    },
    {
      label: 'Chat with data',
      value: 'chat-with-data',
      description: 'Ask natural language questions',
    },
    {
      label: 'Partition stream',
      value: 'partition-stream',
      description: 'Recommend optimal partitions',
    },
    {
      label: 'Onboard stream',
      value: 'onboard-menu',
      description: 'Generate onboarding assets',
    },
    {
      label: 'Analyze stream',
      value: 'analyze-stream',
      description: 'Analyze stream structure',
    },
  ];

  return <Menu items={items} onSelect={onNavigate} onBack={onBack} title="Stream Actions" />;
}
