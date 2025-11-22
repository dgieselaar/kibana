/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Menu, type MenuItem } from '../components/Menu';

interface MainMenuProps {
  onNavigate: (screen: string) => void;
  onExit: () => void;
}

export function MainMenu({ onNavigate, onExit }: MainMenuProps) {
  const items: MenuItem[] = [
    { label: 'Select stream', value: 'select-stream' },
    { label: 'Select connector', value: 'select-connector' },
    { label: 'Set time range', value: 'set-time-range' },
    { label: 'Show logs', value: 'show-logs' },
    { label: 'Exit', value: 'exit' },
  ];

  const handleSelect = (value: string) => {
    if (value === 'exit') {
      onExit();
    } else {
      onNavigate(value);
    }
  };

  return <Menu items={items} onSelect={handleSelect} title="Main Menu" />;
}
