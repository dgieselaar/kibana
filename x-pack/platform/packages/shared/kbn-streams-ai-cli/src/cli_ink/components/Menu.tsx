/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

export interface MenuItem {
  label: string;
  value: string;
  description?: string;
}

interface MenuProps {
  items: MenuItem[];
  onSelect: (value: string) => void;
  onBack?: () => void;
  title?: string;
}

export function Menu({ items, onSelect, onBack, title }: MenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onSelect(items[selectedIndex].value);
    } else if (input === 'q' && onBack) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold>{title}</Text>
        </Box>
      )}
      {items.map((item, index) => (
        <Box key={item.value}>
          <Text color={index === selectedIndex ? 'cyan' : undefined}>
            {index === selectedIndex ? '→ ' : '  '}
            {item.label}
            {item.description && (
              <Text dimColor> - {item.description}</Text>
            )}
          </Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>
          ↑/↓: Navigate | Enter: Select{onBack ? ' | q: Back' : ''}
        </Text>
      </Box>
    </Box>
  );
}
