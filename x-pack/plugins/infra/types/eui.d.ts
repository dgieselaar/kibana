/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '@elastic/eui';
import type { IconType } from '@elastic/eui';
import type { CommonProps } from '@elastic/eui/src/components/common';

declare module '@elastic/eui' {
  interface EuiFormControlLayoutIconProps {
    type: IconType;
    side?: 'left' | 'right';
    onClick?: React.MouseEventHandler<Element>;
  }

  interface EuiFormControlLayoutClearIconProps {
    onClick?: React.MouseEventHandler<Element>;
  }

  type EuiSizesResponsive = 'xs' | 's' | 'm' | 'l' | 'xl';
  type EuiResponsiveProps = CommonProps & {
    children: React.ReactNode;
    sizes: EuiSizesResponsive[];
  };
}
