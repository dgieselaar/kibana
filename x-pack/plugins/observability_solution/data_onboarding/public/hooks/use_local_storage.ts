/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

type AnythingButACallback =
  | string
  | number
  | boolean
  | any[]
  | Record<string, any>
  | null
  | undefined;

function getFromStorage<T>(keyName: string, defaultValue: T): T {
  const storedItem = window.localStorage.getItem(keyName);

  if (storedItem !== null) {
    try {
      return JSON.parse(storedItem) as T;
    } catch (err) {
      window.localStorage.removeItem(keyName);
      // eslint-disable-next-line no-console
      console.log(`Unable to decode: ${keyName}`);
    }
  }
  return defaultValue;
}

type UseLocalStorageReturn<T> = [T, React.Dispatch<React.SetStateAction<T>>];

export function useLocalStorage<T extends AnythingButACallback = never>(
  key: string
): UseLocalStorageReturn<T | undefined>;

export function useLocalStorage<T extends AnythingButACallback = never>(
  key: string,
  defaultValue: T
): UseLocalStorageReturn<T>;

export function useLocalStorage<T extends AnythingButACallback>(
  key: string,
  defaultValue?: T | undefined
): UseLocalStorageReturn<T | undefined> {
  const [storedItem, setStoredItem] = useState<T | undefined>(() =>
    getFromStorage<T | undefined>(key, defaultValue)
  );

  useEffect(() => {
    function onStorageUpdate(e: StorageEvent) {
      if (e.key === key) {
        setStoredItem((prev) => getFromStorage(key, prev));
      }
    }
    window.addEventListener('storage', onStorageUpdate);

    return () => {
      window.removeEventListener('storage', onStorageUpdate);
    };
  }, [key]);

  return [
    storedItem,
    (nextState) => {
      if (typeof nextState === 'function') {
        const nextStateFn = nextState;
        setStoredItem((prevItem) => {
          nextState = nextStateFn(prevItem);
          window.localStorage.setItem(key, JSON.stringify(nextState));
          return nextState;
        });
      } else {
        setStoredItem(nextState);
        window.localStorage.setItem(key, JSON.stringify(nextState));
      }
    },
  ];
}
