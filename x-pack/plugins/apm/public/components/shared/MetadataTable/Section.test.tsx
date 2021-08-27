/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { expectTextsInDocument } from '../../../utils/testHelpers';
import { Section } from './Section';

describe('Section', () => {
  it('shows "empty state message" if no data is available', () => {
    const component = render(<Section keyValuePairs={[]} />);
    expectTextsInDocument(component, ['No data available']);
  });
});
