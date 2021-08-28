/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CoreStart } from '../../../../../../src/core/public/types';
import { UserAPIClient } from '../../management/users/user_api_client';
import type { ChangePasswordProps } from './change_password';

export const getChangePasswordComponent = async (
  core: CoreStart
): Promise<React.FC<ChangePasswordProps>> => {
  const { ChangePassword } = await import('./change_password');

  return (props: ChangePasswordProps) => {
    return (
      <ChangePassword
        notifications={core.notifications}
        userAPIClient={new UserAPIClient(core.http)}
        {...props}
      />
    );
  };
};
