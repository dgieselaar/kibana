/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { APMPolicyForm } from '.';
import type { NewPackagePolicy } from '../../../../../fleet/common/types/models/package_policy';
import type { PackagePolicyCreateExtensionComponentProps } from '../../../../../fleet/public/types/ui_extensions';
import type { PackagePolicyVars } from './typings';

interface Props {
  newPolicy: NewPackagePolicy;
  onChange: PackagePolicyCreateExtensionComponentProps['onChange'];
}

export function CreateAPMPolicyForm({ newPolicy, onChange }: Props) {
  const [firstInput, ...restInputs] = newPolicy?.inputs;
  const vars = firstInput?.vars;

  function handleChange(newVars: PackagePolicyVars, isValid: boolean) {
    onChange({
      isValid,
      updatedPolicy: {
        ...newPolicy,
        inputs: [{ ...firstInput, vars: newVars }, ...restInputs],
      },
    });
  }
  return (
    <APMPolicyForm vars={vars} onChange={handleChange} isCloudPolicy={false} />
  );
}
