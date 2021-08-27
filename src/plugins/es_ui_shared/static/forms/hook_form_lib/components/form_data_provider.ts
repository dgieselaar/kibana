/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useFormData } from '../hooks/use_form_data';
import type { FormData } from '../types';

interface Props<I> {
  children: (formData: I) => JSX.Element | null;
  pathsToWatch?: string | string[];
}

const FormDataProviderComp = function <I extends FormData = FormData>({
  children,
  pathsToWatch,
}: Props<I>) {
  const { 0: formData, 2: isReady } = useFormData<I>({ watch: pathsToWatch });

  if (!isReady) {
    // No field has mounted yet, don't render anything
    return null;
  }

  return children(formData);
};

export const FormDataProvider = React.memo(FormDataProviderComp) as typeof FormDataProviderComp;
