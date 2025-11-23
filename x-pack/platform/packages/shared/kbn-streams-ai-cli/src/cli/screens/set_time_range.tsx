/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import type { MenuItemProps } from '@kbn/ink/menu';
import { Menu } from '@kbn/ink/menu';
import { Input } from '../components/input';
import { TIME_RANGES, parseCustomTimeRange } from '../utils/time_ranges';

import { useAppState } from '../state/use_app_state';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SetTimeRangeProps {}

export function SetTimeRange({}: SetTimeRangeProps) {
  const { setTimeRange, state, back } = useAppState();

  const [showingCustomInput, setShowingCustomInput] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Show custom input when user selects "Custom range". Controlled via state.

  const handleCustomInput = (input: string) => {
    const customRange = parseCustomTimeRange(input);
    if (customRange) {
      setTimeRange(customRange);
      setShowingCustomInput(false);
      setCustomError(null);
    } else {
      setCustomError('Invalid time range format. Use: start,end (e.g., now-7d,now)');
    }
  };

  const items = useMemo(() => {
    const menuItems: MenuItemProps[] = TIME_RANGES.map((timeRangeOption) => {
      return {
        label: timeRangeOption.label,
        description: state.timeRange.option.id === timeRangeOption.id ? '(current)' : '',
      };
    }).concat({
      label: 'Custom range',
      description: '',
    });

    return menuItems;
  }, [state.timeRange.option.id]);

  if (showingCustomInput) {
    return (
      <Box flexDirection="column">
        <Input
          prompt="Enter custom time range (start,end)"
          placeholder="e.g., now-7d,now"
          onSubmit={handleCustomInput}
        />
        {customError && (
          <Box marginTop={1}>
            <Text color="red">{customError}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Declarative menu items for built-in time ranges plus a custom option.
  return (
    <Menu
      label="Set Time Range"
      items={items}
      onSelect={(item) => {
        if (item.label === 'Custom range') {
          setShowingCustomInput(true);
          setCustomError(null);
          return;
        }

        const selected = TIME_RANGES.find((opt) => opt.label === item.label);
        if (selected) {
          setTimeRange(selected);
        }
      }}
      onBack={() => {
        back();
      }}
    />
  );
}
