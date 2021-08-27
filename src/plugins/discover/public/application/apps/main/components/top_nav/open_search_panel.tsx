/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import rison from 'rison-node';
import { SavedObjectFinderUi } from '../../../../../../../saved_objects/public/finder/saved_object_finder';
import { getServices } from '../../../../../kibana_services';

const SEARCH_OBJECT_TYPE = 'search';

interface OpenSearchPanelProps {
  onClose: () => void;
  makeUrl: (id: string) => string;
}

export function OpenSearchPanel(props: OpenSearchPanelProps) {
  const {
    core: { uiSettings, savedObjects },
    addBasePath,
    capabilities,
  } = getServices();

  const hasSavedObjectPermission =
    capabilities.savedObjectsManagement?.edit || capabilities.savedObjectsManagement?.delete;

  return (
    <EuiFlyout ownFocus onClose={props.onClose} data-test-subj="loadSearchForm">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="discover.topNav.openSearchPanel.openSearchTitle"
              defaultMessage="Open search"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SavedObjectFinderUi
          noItemsMessage={
            <FormattedMessage
              id="discover.topNav.openSearchPanel.noSearchesFoundDescription"
              defaultMessage="No matching searches found."
            />
          }
          savedObjectMetaData={[
            {
              type: SEARCH_OBJECT_TYPE,
              getIconForSavedObject: () => 'discoverApp',
              name: i18n.translate('discover.savedSearch.savedObjectName', {
                defaultMessage: 'Saved search',
              }),
            },
          ]}
          onChoose={(id) => {
            window.location.assign(props.makeUrl(id));
            props.onClose();
          }}
          uiSettings={uiSettings}
          savedObjects={savedObjects}
        />
      </EuiFlyoutBody>
      {hasSavedObjectPermission && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiButton
                fill
                onClick={props.onClose}
                data-test-subj="manageSearchesBtn"
                href={addBasePath(
                  `/app/management/kibana/objects?_a=${rison.encode({ tab: SEARCH_OBJECT_TYPE })}`
                )}
              >
                <FormattedMessage
                  id="discover.topNav.openSearchPanel.manageSearchesButtonLabel"
                  defaultMessage="Manage searches"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}
