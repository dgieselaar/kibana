/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Box, Text } from 'ink';
import { useCopyableOutput } from '../hooks/use_copyable_output';

interface CopyBoxProps {
  display: string;
  copy?: string;
}

export function CopyBox(props: CopyBoxProps) {
  const toCopy = props.copy ?? props.display;
  const { isCopied } = useCopyableOutput(toCopy);

  return (
    <>
      <Box>
        <Text>{props.display}</Text>
      </Box>

      <Box>
        {isCopied ? (
          <Text color="green">✓ Copied to clipboard!</Text>
        ) : (
          <Text dimColor>c: Copy | q: Back</Text>
        )}
      </Box>
    </>
  );
}
