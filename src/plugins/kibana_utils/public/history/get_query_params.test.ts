/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Location } from 'history';
import { getQueryParams } from './get_query_params';

describe('getQueryParams', () => {
  it('should getQueryParams', () => {
    const location: Location<any> = {
      pathname: '/dashboard/c3a76790-3134-11ea-b024-83a7b4783735',
      search: "?_a=(description:'')&_b=3",
      state: null,
      hash: '',
    };

    const query = getQueryParams(location);

    expect(query).toMatchInlineSnapshot(`
      Object {
        "_a": "(description:'')",
        "_b": "3",
      }
    `);
  });
});
