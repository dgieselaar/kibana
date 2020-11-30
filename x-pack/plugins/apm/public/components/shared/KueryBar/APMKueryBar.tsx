/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { startsWith } from 'lodash';
import React from 'react';
import { useParams } from 'react-router-dom';
import { useDynamicIndexPattern } from '../../../hooks/useDynamicIndexPattern';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { KueryBar } from './';
import { getBoolFilter } from './get_bool_filter';
import { useProcessorEvent } from './use_processor_event';

export function APMKueryBar() {
  const { groupId, serviceName } = useParams<{
    groupId?: string;
    serviceName?: string;
  }>();

  const { urlParams } = useUrlParams();

  const processorEvent = useProcessorEvent();

  const examples = {
    transaction: 'transaction.duration.us > 300000',
    error: 'http.response.status_code >= 400',
    metric: 'process.pid = "1234"',
    defaults:
      'transaction.duration.us > 300000 AND http.response.status_code >= 400',
  };

  const example = examples[processorEvent || 'defaults'];

  const { indexPattern } = useDynamicIndexPattern(processorEvent);

  const placeholder = i18n.translate('xpack.apm.kueryBar.placeholder', {
    defaultMessage: `Search {event, select,
            transaction {transactions}
            metric {metrics}
            error {errors}
            other {transactions, errors and metrics}
          } (E.g. {queryExample})`,
    values: {
      queryExample: example,
      event: processorEvent,
    },
  });

  const boolFilter = getBoolFilter({
    groupId,
    processorEvent,
    serviceName,
    urlParams,
  });

  return (
    <KueryBar
      indexPattern={indexPattern}
      placeholder={placeholder}
      boolFilter={boolFilter}
      filterSuggestions={(suggestions) => {
        return suggestions.filter(
          (suggestion) => !startsWith(suggestion.text, 'span.')
        );
      }}
    />
  );
}
