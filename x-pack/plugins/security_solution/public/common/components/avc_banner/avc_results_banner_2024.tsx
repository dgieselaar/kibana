/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../lib/kibana';
import avcBannerBackground from './avc_banner_background.svg';

export const AVCResultsBanner2024: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { docLinks } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const bannerTitle = i18n.translate('xpack.securitySolution.common.avcResultsBanner.title', {
    defaultMessage: '100% protection with zero false positives.',
  });

  const calloutStyles = css({
    paddingLeft: `${euiTheme.size.xl}`,
    backgroundImage: `url(${avcBannerBackground})`,
    backgroundRepeat: 'no-repeat',
    backgroundPositionX: 'right',
    backgroundPositionY: 'bottom',
  });

  return (
    <EuiCallOut
      title={bannerTitle}
      color="success"
      iconType="cheer"
      onDismiss={onDismiss}
      className={calloutStyles}
      data-test-subj="avcResultsBanner"
    >
      <FormattedMessage
        id="xpack.securitySolution.common.avcResultsBanner.body"
        defaultMessage="Elastic Security shines in Malware Protection Test by AV-Comparatives"
      />
      <EuiSpacer size="s" />
      <EuiButton
        size="s"
        color="success"
        href={docLinks.links.securitySolution.avcResults}
        data-test-subj="avcReadTheBlog"
      >
        <FormattedMessage
          id="xpack.securitySolution.common.avcResults.readTheBlog.link"
          defaultMessage="Read the blog"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
