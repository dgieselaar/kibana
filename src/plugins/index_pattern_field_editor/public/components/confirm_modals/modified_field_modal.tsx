/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const i18nTexts = {
  title: i18n.translate('indexPatternFieldEditor.cancelField.confirmationModal.title', {
    defaultMessage: 'Discard changes',
  }),
  description: i18n.translate('indexPatternFieldEditor.cancelField.confirmationModal.description', {
    defaultMessage: `Changes that you've made to your field will be discarded, are you sure you want to continue?`,
  }),
  cancelButton: i18n.translate(
    'indexPatternFieldEditor.cancelField.confirmationModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
};

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ModifiedFieldModal: React.FC<Props> = ({ onCancel, onConfirm }) => {
  return (
    <EuiConfirmModal
      title={i18nTexts.title}
      data-test-subj="runtimeFieldModifiedFieldConfirmModal"
      cancelButtonText={i18nTexts.cancelButton}
      confirmButtonText={i18nTexts.title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      maxWidth={600}
    >
      <p>{i18nTexts.description}</p>
    </EuiConfirmModal>
  );
};
