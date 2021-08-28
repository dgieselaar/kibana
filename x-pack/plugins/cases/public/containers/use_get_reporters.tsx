/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '../../common/api/user';
import { useToasts } from '../common/lib/kibana/hooks';
import { useOwnerContext } from '../components/owner_context/use_owner_context';
import { getReporters } from './api';
import * as i18n from './translations';

interface ReportersState {
  reporters: string[];
  respReporters: User[];
  isLoading: boolean;
  isError: boolean;
}

const initialData: ReportersState = {
  reporters: [],
  respReporters: [],
  isLoading: true,
  isError: false,
};

export interface UseGetReporters extends ReportersState {
  fetchReporters: () => void;
}

export const useGetReporters = (): UseGetReporters => {
  const owner = useOwnerContext();
  const [reportersState, setReporterState] = useState<ReportersState>(initialData);

  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const fetchReporters = useCallback(async () => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      setReporterState({
        ...reportersState,
        isLoading: true,
      });

      const response = await getReporters(abortCtrlRef.current.signal, owner);
      const myReporters = response
        .map((r) => (r.full_name == null || isEmpty(r.full_name) ? r.username ?? '' : r.full_name))
        .filter((u) => !isEmpty(u));

      if (!isCancelledRef.current) {
        setReporterState({
          reporters: myReporters,
          respReporters: response,
          isLoading: false,
          isError: false,
        });
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }

        setReporterState({
          reporters: [],
          respReporters: [],
          isLoading: false,
          isError: true,
        });
      }
    }
  }, [owner, reportersState, toasts]);

  useEffect(() => {
    fetchReporters();
    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...reportersState, fetchReporters };
};
