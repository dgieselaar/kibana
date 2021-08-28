/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { LogoProps } from '../types';

function Logo(props: LogoProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" {...props}>
      <path
        fill="#293F41"
        fillRule="evenodd"
        d="M0 20.566v-8.418h2.166v.689C2.806 12.295 3.594 12 4.53 12a3.74 3.74 0 012.905 1.379c.541.64.886 1.526.886 2.953v4.283H6.055v-4.48c0-.837-.197-1.28-.492-1.575-.295-.295-.738-.492-1.28-.492-.935 0-1.723.59-2.018 1.034v5.464H0z"
      />
      <path
        fill="#82B6A1"
        fillRule="evenodd"
        d="M14.08 12c-2.659 0-4.923 2.166-4.923 4.874 0 1.428.59 2.707 1.526 3.643.345.345.886.345 1.28.05.542-.444 1.28-.69 2.117-.69s1.526.246 2.117.69a.976.976 0 001.28-.1 4.936 4.936 0 001.526-3.593C18.953 14.215 16.788 12 14.08 12zm-.05 7.385c-1.427 0-2.46-1.084-2.46-2.462 0-1.378.984-2.461 2.46-2.461 1.478 0 2.462 1.132 2.462 2.461 0 1.33-.984 2.462-2.461 2.462z"
      />
      <path
        fill="#293F41"
        fillRule="evenodd"
        d="M23.385 20.566H21.71l-3.348-8.418h2.265l1.821 4.824 1.822-4.824h1.87l1.773 4.824 1.821-4.824H32l-3.348 8.418h-1.674l-1.772-4.775-1.821 4.775z"
      />
    </svg>
  );
}

// eslint-disable-next-line import/no-default-export
export default Logo;
