/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInput } from 'ink';
import { useEffect, useMemo, useState } from 'react';
import { copy } from '../utils/copy';

interface UseCopyableOutput {
  isCopied: boolean;
}

export function useCopyableOutput(value?: string): UseCopyableOutput {
  const [isCopied, setIsCopied] = useState(false);

  useInput((input, key) => {
    if (value && input === 'c') {
      setIsCopied(true);
      copy(value);
    }
  });

  useEffect(() => {
    setIsCopied(false);
  }, [value]);

  return useMemo(
    () => ({
      isCopied,
    }),
    [isCopied]
  );
}
