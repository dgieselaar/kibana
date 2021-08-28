/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SearchSessionStatus } from '../../../../../../src/plugins/data/common/search/session/status';
import type { SearchSessionSavedObjectAttributes } from '../../../../../../src/plugins/data/common/search/session/types';
import { ACTION } from './components/actions/types';

export const DATE_STRING_FORMAT = 'D MMM, YYYY, HH:mm:ss';

/**
 * Some properties are optional for a non-persisted Search Session.
 * This interface makes them mandatory, because management only shows persisted search sessions.
 */
export type PersistedSearchSessionSavedObjectAttributes = SearchSessionSavedObjectAttributes &
  Required<
    Pick<
      SearchSessionSavedObjectAttributes,
      'name' | 'appId' | 'urlGeneratorId' | 'initialState' | 'restoreState'
    >
  >;

export type UISearchSessionState = SearchSessionStatus;

export interface UISession {
  id: string;
  name: string;
  appId: string;
  created: string;
  expires: string | null;
  status: UISearchSessionState;
  numSearches: number;
  actions?: ACTION[];
  reloadUrl: string;
  restoreUrl: string;
  initialState: Record<string, unknown>;
  restoreState: Record<string, unknown>;
  version: string;
}
