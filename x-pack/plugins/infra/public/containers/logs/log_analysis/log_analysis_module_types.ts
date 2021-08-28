/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { estypes } from '@elastic/elasticsearch';
import type { HttpHandler } from '../../../../../../../src/core/public/http/types';
import type { ValidateLogEntryDatasetsResponsePayload } from '../../../../common/http_api/log_analysis/validation/datasets';
import type { ValidationIndicesResponsePayload } from '../../../../common/http_api/log_analysis/validation/log_entry_rate_indices';
import type { DatasetFilter } from '../../../../common/log_analysis/job_parameters';
import type { DeleteJobsResponsePayload } from './api/ml_cleanup';
import type { FetchJobStatusResponsePayload } from './api/ml_get_jobs_summary_api';
import type { GetMlModuleResponsePayload } from './api/ml_get_module';
import type { SetupMlModuleResponsePayload } from './api/ml_setup_module_api';

export { JobModelSizeStats, JobSummary } from './api/ml_get_jobs_summary_api';

export interface ModuleDescriptor<JobType extends string> {
  moduleId: string;
  moduleName: string;
  moduleDescription: string;
  jobTypes: JobType[];
  bucketSpan: number;
  getJobIds: (spaceId: string, sourceId: string) => Record<JobType, string>;
  getJobSummary: (
    spaceId: string,
    sourceId: string,
    fetch: HttpHandler
  ) => Promise<FetchJobStatusResponsePayload>;
  getModuleDefinition: (fetch: HttpHandler) => Promise<GetMlModuleResponsePayload>;
  setUpModule: (
    start: number | undefined,
    end: number | undefined,
    datasetFilter: DatasetFilter,
    sourceConfiguration: ModuleSourceConfiguration,
    fetch: HttpHandler
  ) => Promise<SetupMlModuleResponsePayload>;
  cleanUpModule: (
    spaceId: string,
    sourceId: string,
    fetch: HttpHandler
  ) => Promise<DeleteJobsResponsePayload>;
  validateSetupIndices: (
    indices: string[],
    timestampField: string,
    runtimeMappings: estypes.MappingRuntimeFields,
    fetch: HttpHandler
  ) => Promise<ValidationIndicesResponsePayload>;
  validateSetupDatasets: (
    indices: string[],
    timestampField: string,
    startTime: number,
    endTime: number,
    runtimeMappings: estypes.MappingRuntimeFields,
    fetch: HttpHandler
  ) => Promise<ValidateLogEntryDatasetsResponsePayload>;
}

export interface ModuleSourceConfiguration {
  indices: string[];
  sourceId: string;
  spaceId: string;
  timestampField: string;
  runtimeMappings: estypes.MappingRuntimeFields;
}
