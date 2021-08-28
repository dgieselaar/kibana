/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo, useEffect, useState } from 'react';

import type { TutorialDirectoryHeaderLinkComponent } from '../../../../../../src/plugins/home/public/services/tutorials/tutorial_service';
import { RedirectAppLinks } from '../../../../../../src/plugins/kibana_react/public/app_links/redirect_app_link';
import { useCapabilities } from '../../hooks/use_capabilities';
import { useStartServices } from '../../hooks/use_core';
import { useLink } from '../../hooks/use_link';

import { tutorialDirectoryNoticeState$ } from './tutorial_directory_notice';

const TutorialDirectoryHeaderLink: TutorialDirectoryHeaderLinkComponent = memo(() => {
  const { getHref } = useLink();
  const { application } = useStartServices();
  const { show: hasIngestManager } = useCapabilities();
  const [noticeState, setNoticeState] = useState({
    settingsDataLoaded: false,
    hasSeenNotice: false,
  });

  useEffect(() => {
    const subscription = tutorialDirectoryNoticeState$.subscribe((value) => setNoticeState(value));
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return hasIngestManager && noticeState.settingsDataLoaded && noticeState.hasSeenNotice ? (
    <RedirectAppLinks application={application}>
      <EuiButtonEmpty size="s" iconType="link" flush="right" href={getHref('integrations')}>
        <FormattedMessage
          id="xpack.fleet.homeIntegration.tutorialDirectory.fleetAppButtonText"
          defaultMessage="Try Integrations"
        />
      </EuiButtonEmpty>
    </RedirectAppLinks>
  ) : null;
});

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default TutorialDirectoryHeaderLink;
