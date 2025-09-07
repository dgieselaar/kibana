/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useRef } from 'react';

interface CallbackProps {
  signal: AbortSignal;
}

/**
 * Returns a callback that is automatically aborted when:
 * - the component unmounts
 * - the callback is called again
 */
export function useStreamsAppFetchCallback<TReturn, TArgs extends any[] = []>(
  callback: (props: CallbackProps, ...args: TArgs) => TReturn,
  deps: any[]
): (...args: TArgs) => TReturn {
  const controllerRef = useRef<AbortController>();

  const callbackRef = useRef<(options: CallbackProps, ...args: TArgs) => TReturn>();

  callbackRef.current = callback;

  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      controller?.abort();
    };
  }, []);

  return useCallback(
    (...args) => {
      controllerRef.current?.abort();

      const next = new AbortController();
      controllerRef.current = next;

      return callbackRef.current!({ signal: controllerRef.current?.signal! }, ...args);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps]
  );
}
