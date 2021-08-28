/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import type { Field } from '../../../../../../../../../common/types/fields';
import {
  filterCategoryFields,
  newJobCapsService,
} from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { PopulationJobCreator } from '../../../../../common/job_creator/population_job_creator';
import { JobCreatorContext } from '../../../job_creator_context';
import { SplitFieldSelect } from '../split_field_select/split_field_select';

interface Props {
  detectorIndex: number;
}

export const ByFieldSelector: FC<Props> = ({ detectorIndex }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as PopulationJobCreator;

  const runtimeCategoryFields = useMemo(() => filterCategoryFields(jobCreator.runtimeFields), []);
  const allCategoryFields = useMemo(
    () => [...newJobCapsService.categoryFields, ...runtimeCategoryFields],
    []
  );

  const [byField, setByField] = useState(jobCreator.getByField(detectorIndex));
  const categoryFields = useFilteredCategoryFields(
    allCategoryFields,
    jobCreator,
    jobCreatorUpdated
  );

  useEffect(() => {
    jobCreator.setByField(byField, detectorIndex);
    // add the by field to the influencers
    if (byField !== null && jobCreator.influencers.includes(byField.name) === false) {
      jobCreator.addInfluencer(byField.name);
    }
    jobCreatorUpdate();
  }, [byField]);

  useEffect(() => {
    const bf = jobCreator.getByField(detectorIndex);
    setByField(bf);
  }, [jobCreatorUpdated]);

  return (
    <SplitFieldSelect
      fields={categoryFields}
      changeHandler={setByField}
      selectedField={byField}
      isClearable={true}
      testSubject="mlByFieldSelect"
      placeholder={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.populationField.placeholder',
        {
          defaultMessage: 'Split data',
        }
      )}
    />
  );
};

// remove the population (over) field from the by field options
function useFilteredCategoryFields(
  allCategoryFields: Field[],
  jobCreator: PopulationJobCreator,
  jobCreatorUpdated: number
) {
  const [fields, setFields] = useState(allCategoryFields);

  useEffect(() => {
    const pf = jobCreator.populationField;
    if (pf !== null) {
      setFields(allCategoryFields.filter(({ name }) => name !== pf.name));
    } else {
      setFields(allCategoryFields);
    }
  }, [jobCreatorUpdated]);

  return fields;
}
