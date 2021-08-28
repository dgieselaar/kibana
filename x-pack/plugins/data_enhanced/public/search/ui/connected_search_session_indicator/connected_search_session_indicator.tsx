/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { merge, of, timer } from 'rxjs';
import { debounce, distinctUntilChanged, mapTo, switchMap, tap } from 'rxjs/operators';
import type { ApplicationStart } from '../../../../../../../src/core/public/application/types';
import type { IBasePath } from '../../../../../../../src/core/public/http/types';
import type { SearchUsageCollector } from '../../../../../../../src/plugins/data/public/search/collectors/types';
import { SearchSessionState } from '../../../../../../../src/plugins/data/public/search/session/search_session_state';
import type { ISessionService } from '../../../../../../../src/plugins/data/public/search/session/session_service';
import { RedirectAppLinks } from '../../../../../../../src/plugins/kibana_react/public/app_links/redirect_app_link';
import type { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public/storage/types';
import { SearchSessionIndicator } from '../search_session_indicator';
import type { SearchSessionIndicatorRef } from '../search_session_indicator/search_session_indicator';
import { useSearchSessionTour } from './search_session_tour';

export interface SearchSessionIndicatorDeps {
  sessionService: ISessionService;
  application: ApplicationStart;
  basePath: IBasePath;
  storage: IStorageWrapper;
  /**
   * Controls for how long we allow to save a session,
   * after the last search in the session has completed
   */
  disableSaveAfterSessionCompletesTimeout: number;
  usageCollector?: SearchUsageCollector;
}

export const createConnectedSearchSessionIndicator = ({
  sessionService,
  application,
  storage,
  disableSaveAfterSessionCompletesTimeout,
  usageCollector,
  basePath,
}: SearchSessionIndicatorDeps): React.FC => {
  const searchSessionsManagementUrl = basePath.prepend('/app/management/kibana/search_sessions');

  const debouncedSessionServiceState$ = sessionService.state$.pipe(
    debounce((_state) => timer(_state === SearchSessionState.None ? 50 : 300)) // switch to None faster to quickly remove indicator when navigating away
  );

  const disableSaveAfterSessionCompleteTimedOut$ = sessionService.state$.pipe(
    switchMap((_state) =>
      _state === SearchSessionState.Completed
        ? merge(of(false), timer(disableSaveAfterSessionCompletesTimeout).pipe(mapTo(true)))
        : of(false)
    ),
    distinctUntilChanged(),
    tap((value) => {
      if (value) usageCollector?.trackSessionIndicatorSaveDisabled();
    })
  );

  return () => {
    const state = useObservable(debouncedSessionServiceState$, SearchSessionState.None);
    const isSaveDisabledByApp = sessionService.getSearchSessionIndicatorUiConfig().isDisabled();
    const disableSaveAfterSessionCompleteTimedOut = useObservable(
      disableSaveAfterSessionCompleteTimedOut$,
      false
    );
    const [
      searchSessionIndicator,
      setSearchSessionIndicator,
    ] = useState<SearchSessionIndicatorRef | null>(null);
    const searchSessionIndicatorRef = useCallback((ref: SearchSessionIndicatorRef) => {
      if (ref !== null) {
        setSearchSessionIndicator(ref);
      }
    }, []);

    let saveDisabled = false;
    let saveDisabledReasonText: string = '';

    let managementDisabled = false;
    let managementDisabledReasonText: string = '';

    if (disableSaveAfterSessionCompleteTimedOut) {
      saveDisabled = true;
      saveDisabledReasonText = i18n.translate(
        'xpack.data.searchSessionIndicator.disabledDueToTimeoutMessage',
        {
          defaultMessage: 'Search session results expired.',
        }
      );
    }

    if (isSaveDisabledByApp.disabled) {
      saveDisabled = true;
      saveDisabledReasonText = isSaveDisabledByApp.reasonText;
    }

    // check if user doesn't have access to search_sessions and search_sessions mgtm
    // this happens in case there is no app that allows current user to use search session
    if (!sessionService.hasAccess()) {
      managementDisabled = saveDisabled = true;
      managementDisabledReasonText = saveDisabledReasonText = i18n.translate(
        'xpack.data.searchSessionIndicator.disabledDueToDisabledGloballyMessage',
        {
          defaultMessage: "You don't have permissions to manage search sessions",
        }
      );
    }

    const { markOpenedDone, markRestoredDone } = useSearchSessionTour(
      storage,
      searchSessionIndicator,
      state,
      saveDisabled,
      usageCollector
    );

    const onOpened = useCallback(
      (openedState: SearchSessionState) => {
        markOpenedDone();
        if (openedState === SearchSessionState.Restored) {
          markRestoredDone();
        }
      },
      [markOpenedDone, markRestoredDone]
    );

    const onContinueInBackground = useCallback(() => {
      if (saveDisabled) return;
      usageCollector?.trackSessionSentToBackground();
      sessionService.save();
    }, [saveDisabled]);

    const onSaveResults = useCallback(() => {
      if (saveDisabled) return;
      usageCollector?.trackSessionSavedResults();
      sessionService.save();
    }, [saveDisabled]);

    const onCancel = useCallback(() => {
      usageCollector?.trackSessionCancelled();
      sessionService.cancel();
    }, []);

    const onViewSearchSessions = useCallback(() => {
      usageCollector?.trackViewSessionsList();
    }, []);

    useEffect(() => {
      if (state === SearchSessionState.Restored) {
        usageCollector?.trackSessionIsRestored();
      }
    }, [state]);

    const {
      name: searchSessionName,
      startTime,
      completedTime,
      canceledTime,
    } = useObservable(sessionService.sessionMeta$, { state });
    const saveSearchSessionNameFn = useCallback(async (newName: string) => {
      await sessionService.renameCurrentSession(newName);
    }, []);

    if (!sessionService.isSessionStorageReady()) return null;
    return (
      <RedirectAppLinks application={application}>
        <SearchSessionIndicator
          ref={searchSessionIndicatorRef}
          state={state}
          saveDisabled={saveDisabled}
          saveDisabledReasonText={saveDisabledReasonText}
          managementDisabled={managementDisabled}
          managementDisabledReasonText={managementDisabledReasonText}
          onContinueInBackground={onContinueInBackground}
          onSaveResults={onSaveResults}
          onCancel={onCancel}
          onOpened={onOpened}
          onViewSearchSessions={onViewSearchSessions}
          viewSearchSessionsLink={searchSessionsManagementUrl}
          searchSessionName={searchSessionName}
          saveSearchSessionNameFn={saveSearchSessionNameFn}
          startedTime={startTime}
          completedTime={completedTime}
          canceledTime={canceledTime}
        />
      </RedirectAppLinks>
    );
  };
};
