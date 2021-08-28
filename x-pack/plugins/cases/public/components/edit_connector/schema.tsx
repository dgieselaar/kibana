/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FIELD_TYPES } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/constants';
import type { FormSchema } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/types';

export interface FormProps {
  connectorId: string;
}

export const schema: FormSchema<FormProps> = {
  connectorId: {
    type: FIELD_TYPES.SUPER_SELECT,
  },
};
