/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import type { IManagementSectionsPluginsSetup, SessionsConfigSchema } from '..';
import type { CoreStart } from '../../../../../../../src/core/public/types';
import type { HttpStart } from '../../../../../../../src/core/public/http/types';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { SearchSessionsMgmtTable } from './table/table';

interface Props {
  documentation: AsyncSearchIntroDocumentation;
  core: CoreStart;
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  timezone: string;
  config: SessionsConfigSchema;
  plugins: IManagementSectionsPluginsSetup;
  kibanaVersion: string;
}

export function SearchSessionsMgmtMain({ documentation, ...tableProps }: Props) {
  return (
    <>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.data.mgmt.searchSessions.main.sectionTitle"
            defaultMessage="Search Sessions"
          />
        }
        description={
          <FormattedMessage
            id="xpack.data.mgmt.searchSessions.main.sectionDescription"
            defaultMessage="Manage your saved search sessions."
          />
        }
        bottomBorder
        rightSideItems={[
          <EuiButtonEmpty
            href={documentation.getElasticsearchDocLink()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.data.mgmt.searchSessions.main.backgroundSessionsDocsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />
      <SearchSessionsMgmtTable data-test-subj="search-sessions-mgmt-table" {...tableProps} />
    </>
  );
}
