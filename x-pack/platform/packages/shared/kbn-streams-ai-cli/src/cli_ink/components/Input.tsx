/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface InputProps {
  prompt: string;
  onSubmit: (value: string) => void;
  onBack?: () => void;
  placeholder?: string;
}

export function Input({ prompt, onSubmit, onBack, placeholder }: InputProps) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
      setValue('');
    } else if (key.delete || key.backspace) {
      setValue((prev) => prev.slice(0, -1));
    } else if (input === 'q' && value === '' && onBack) {
      onBack();
    } else if (!key.ctrl && !key.meta && input) {
      setValue((prev) => prev + input);
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">
          {prompt}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          {value || (placeholder && <Text dimColor>{placeholder}</Text>)}
          <Text color="cyan">_</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Enter: Submit{onBack ? ' | q: Back (when empty)' : ''}</Text>
      </Box>
    </Box>
  );
}
