/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Menu, type MenuItem } from '../components/Menu';
import { Input } from '../components/Input';
import { TIME_RANGES, parseCustomTimeRange } from '../utils/time_ranges';
import { Box, Text } from 'ink';

interface SetTimeRangeProps {
  currentTimeRangeId: string;
  onSelect: (timeRangeId: string) => void;
  onBack: () => void;
}

export function SetTimeRange({ currentTimeRangeId, onSelect, onBack }: SetTimeRangeProps) {
  const [showingCustomInput, setShowingCustomInput] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const items: MenuItem[] = [
    ...TIME_RANGES.map((range) => ({
      label: range.label,
      value: range.id,
      description: currentTimeRangeId === range.id ? '(current)' : undefined,
    })),
    { label: 'Custom range', value: '_custom' },
  ];

  const handleSelect = (value: string) => {
    if (value === '_custom') {
      setShowingCustomInput(true);
      setCustomError(null);
    } else {
      onSelect(value);
    }
  };

  const handleCustomInput = (input: string) => {
    const customRange = parseCustomTimeRange(input);
    if (customRange) {
      onSelect(customRange.id);
      setShowingCustomInput(false);
      setCustomError(null);
    } else {
      setCustomError('Invalid time range format. Use: start,end (e.g., now-7d,now)');
    }
  };

  const handleCustomBack = () => {
    setShowingCustomInput(false);
    setCustomError(null);
  };

  if (showingCustomInput) {
    return (
      <Box flexDirection="column">
        <Input
          prompt="Enter custom time range (start,end)"
          placeholder="e.g., now-7d,now"
          onSubmit={handleCustomInput}
          onBack={handleCustomBack}
        />
        {customError && (
          <Box marginTop={1}>
            <Text color="red">{customError}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return <Menu items={items} onSelect={handleSelect} onBack={onBack} title="Set Time Range" />;
}
