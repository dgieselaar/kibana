/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FC } from 'react';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { isAdvancedJobCreator } from '../../../common/job_creator/type_guards';
import { EDITOR_MODE, JsonEditorFlyout } from '../common/json_editor_flyout/json_editor_flyout';
import { JobCreatorContext } from '../job_creator_context';
import type { StepProps } from '../step_types';
import { WIZARD_STEPS } from '../step_types';
import { WizardNav } from '../wizard_nav/wizard_nav';
import { AdditionalSection } from './components/additional_section/additional_section';
import { AdvancedSection } from './components/advanced_section/advanced_section';
import { GroupsInput } from './components/groups/groups_input';
import { JobDescriptionInput } from './components/job_description/job_description_input';
import { JobIdInput } from './components/job_id/job_id_input';

interface Props extends StepProps {
  advancedExpanded: boolean;
  setAdvancedExpanded: (a: boolean) => void;
  additionalExpanded: boolean;
  setAdditionalExpanded: (a: boolean) => void;
}

export const JobDetailsStep: FC<Props> = ({
  setCurrentStep,
  isCurrentStep,
  advancedExpanded,
  setAdvancedExpanded,
  additionalExpanded,
  setAdditionalExpanded,
}) => {
  const { jobCreator, jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);

  useEffect(() => {
    const active =
      jobValidator.jobId.valid &&
      jobValidator.modelMemoryLimit.valid &&
      jobValidator.groupIds.valid &&
      jobValidator.latestValidationResult.jobIdExists?.valid === true &&
      jobValidator.latestValidationResult.groupIdsExist?.valid === true &&
      jobValidator.validating === false;
    setNextActive(active);
  }, [jobValidatorUpdated]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <JobIdInput />
              <GroupsInput />
            </EuiFlexItem>
            <EuiFlexItem>
              <JobDescriptionInput />
            </EuiFlexItem>
          </EuiFlexGroup>

          <AdditionalSection
            additionalExpanded={additionalExpanded}
            setAdditionalExpanded={setAdditionalExpanded}
          />

          <AdvancedSection
            advancedExpanded={advancedExpanded}
            setAdvancedExpanded={setAdvancedExpanded}
          />

          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)}
            next={() => setCurrentStep(WIZARD_STEPS.VALIDATION)}
            nextActive={nextActive}
          >
            {isAdvancedJobCreator(jobCreator) && (
              <JsonEditorFlyout
                isDisabled={false}
                jobEditorMode={EDITOR_MODE.EDITABLE}
                datafeedEditorMode={EDITOR_MODE.EDITABLE}
              />
            )}
          </WizardNav>
        </Fragment>
      )}
    </Fragment>
  );
};
