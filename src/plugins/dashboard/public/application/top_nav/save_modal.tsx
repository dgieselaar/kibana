/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiFormRow, EuiSwitch, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { SavedObjectSaveModal } from '../../../../saved_objects/public/save_modal/saved_object_save_modal';
import type { SavedObjectsTaggingApi } from '../../../../saved_objects_tagging_oss/public/api';
import type { DashboardSaveOptions } from '../../types';

interface Props {
  onSave: ({
    newTitle,
    newDescription,
    newCopyOnSave,
    newTags,
    newTimeRestore,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: DashboardSaveOptions) => void;
  onClose: () => void;
  title: string;
  description: string;
  tags?: string[];
  timeRestore: boolean;
  showCopyOnSave: boolean;
  savedObjectsTagging?: SavedObjectsTaggingApi;
}

interface State {
  description: string;
  tags: string[];
  timeRestore: boolean;
}

export class DashboardSaveModal extends React.Component<Props, State> {
  state: State = {
    description: this.props.description,
    timeRestore: this.props.timeRestore,
    tags: this.props.tags ?? [],
  };

  constructor(props: Props) {
    super(props);
  }

  saveDashboard = ({
    newTitle,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: {
    newTitle: string;
    newCopyOnSave: boolean;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  }) => {
    this.props.onSave({
      newTitle,
      newDescription: this.state.description,
      newCopyOnSave,
      newTimeRestore: this.state.timeRestore,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
      newTags: this.state.tags,
    });
  };

  onDescriptionChange = (event: any) => {
    this.setState({
      description: event.target.value,
    });
  };

  onTimeRestoreChange = (event: any) => {
    this.setState({
      timeRestore: event.target.checked,
    });
  };

  renderDashboardSaveOptions() {
    const { savedObjectsTagging } = this.props;
    const tagSelector = savedObjectsTagging ? (
      <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
        initialSelection={this.state.tags}
        onTagsSelected={(tags) => {
          this.setState({
            tags,
          });
        }}
      />
    ) : undefined;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="dashboard.topNav.saveModal.descriptionFormRowLabel"
              defaultMessage="Description"
            />
          }
        >
          <EuiTextArea
            data-test-subj="dashboardDescription"
            value={this.state.description}
            onChange={this.onDescriptionChange}
          />
        </EuiFormRow>

        {tagSelector}

        <EuiFormRow
          helpText={
            <FormattedMessage
              id="dashboard.topNav.saveModal.storeTimeWithDashboardFormRowHelpText"
              defaultMessage="This changes the time filter to the currently selected time each time this dashboard is loaded."
            />
          }
        >
          <EuiSwitch
            data-test-subj="storeTimeWithDashboard"
            checked={this.state.timeRestore}
            onChange={this.onTimeRestoreChange}
            label={
              <FormattedMessage
                id="dashboard.topNav.saveModal.storeTimeWithDashboardFormRowLabel"
                defaultMessage="Store time with dashboard"
              />
            }
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  render() {
    return (
      <SavedObjectSaveModal
        onSave={this.saveDashboard}
        onClose={this.props.onClose}
        title={this.props.title}
        showCopyOnSave={this.props.showCopyOnSave}
        initialCopyOnSave={this.props.showCopyOnSave}
        objectType={i18n.translate('dashboard.topNav.saveModal.objectType', {
          defaultMessage: 'dashboard',
        })}
        options={this.renderDashboardSaveOptions()}
        showDescription={false}
      />
    );
  }
}
