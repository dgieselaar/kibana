/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefinitionEntity } from '../common/entities';

export const allDataStreamsEntity: DefinitionEntity = {
  id: 'data_streams',
  key: 'data_streams',
  displayName: 'Data streams',
  type: 'data_stream',
  pivot: {
    identityFields: ['data_stream.dataset', 'data_stream.type', 'data_stream.namespace'],
  },
  filters: [
    {
      index: ['logs-*', 'metrics-*', 'traces-*', '.entities.v1.instance.data_streams'],
    },
  ],
};

export const allLogsEntity: DefinitionEntity = {
  id: 'data_streams',
  key: 'data_streams',
  displayName: 'Data streams',
  type: 'data_stream',
  pivot: {
    identityFields: ['data_stream.dataset', 'data_stream.type', 'data_stream.namespace'],
  },
  filters: [
    {
      index: ['logs-*', '.entities.v1.instance.data_streams'],
    },
  ],
};

// export const allLogsEntity: DefinitionEntity = {
//   id: 'all_logs',
//   displayName: 'All logs',
//   type: 'data_stream',
//   pivot: {
//     identityFields: ['data_stream.dataset', 'data_stream.type', 'data_stream.namespace'],
//   },
//   filters: [
//     {
//       index: ['logs-*'],
//     },
//   ],
// };

export const builtinEntityDefinitions = [allDataStreamsEntity, allLogsEntity];
