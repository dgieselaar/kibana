/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { memo, useEffect, useState } from 'react';

import type { IFieldType } from '../../../../../../../../../../../src/plugins/data/common/index_patterns/fields/types';
import { QueryStringInput } from '../../../../../../../../../../../src/plugins/data/public/ui/query_string_input';
import { useStartServices } from '../../../../../../../hooks/use_core';

import {
  AGENT_ID_FIELD,
  AGENT_LOG_INDEX_PATTERN,
  DATASET_FIELD,
  LOG_LEVEL_FIELD,
} from './constants';

const EXCLUDED_FIELDS = [AGENT_ID_FIELD.name, DATASET_FIELD.name, LOG_LEVEL_FIELD.name];

export const LogQueryBar: React.FunctionComponent<{
  query: string;
  isQueryValid: boolean;
  onUpdateQuery: (query: string, runQuery?: boolean) => void;
}> = memo(({ query, isQueryValid, onUpdateQuery }) => {
  const { data } = useStartServices();
  const [indexPatternFields, setIndexPatternFields] = useState<IFieldType[]>();

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const fields = (
          ((await data.indexPatterns.getFieldsForWildcard({
            pattern: AGENT_LOG_INDEX_PATTERN,
          })) as IFieldType[]) || []
        ).filter((field) => {
          return !EXCLUDED_FIELDS.includes(field.name);
        });
        setIndexPatternFields(fields);
      } catch (err) {
        setIndexPatternFields(undefined);
      }
    };
    fetchFields();
  }, [data.indexPatterns]);

  return (
    <QueryStringInput
      iconType="search"
      disableLanguageSwitcher={true}
      indexPatterns={
        indexPatternFields
          ? [
              {
                title: AGENT_LOG_INDEX_PATTERN,
                fields: indexPatternFields,
              },
            ]
          : []
      }
      query={{
        query,
        language: 'kuery',
      }}
      isInvalid={!isQueryValid}
      disableAutoFocus={true}
      placeholder={i18n.translate('xpack.fleet.agentLogs.searchPlaceholderText', {
        defaultMessage: 'Search logs…',
      })}
      onChange={(newQuery) => {
        onUpdateQuery(newQuery.query as string);
      }}
      onSubmit={(newQuery) => {
        onUpdateQuery(newQuery.query as string, true);
      }}
    />
  );
});
