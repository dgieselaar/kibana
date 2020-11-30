/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniqueId } from 'lodash';
import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ESFilter } from '../../../../../../typings/elasticsearch';
import {
  esKuery,
  IIndexPattern,
  QuerySuggestion,
} from '../../../../../../../src/plugins/data/public';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../Links/url_helpers';
// @ts-expect-error
import { Typeahead } from './Typeahead';

const Container = styled.div`
  margin-bottom: 10px;
`;

interface Props {
  indexPattern?: IIndexPattern;
  boolFilter?: ESFilter[];
  placeholder: string;
  filterSuggestions?: (suggestions: QuerySuggestion[]) => QuerySuggestion[];
}

interface State {
  suggestions: QuerySuggestion[];
  isLoadingSuggestions: boolean;
}

function convertKueryToEsQuery(kuery: string, indexPattern: IIndexPattern) {
  const ast = esKuery.fromKueryExpression(kuery);
  return esKuery.toElasticsearchQuery(ast, indexPattern);
}

export function KueryBar(props: Props) {
  const history = useHistory();
  const [state, setState] = useState<State>({
    suggestions: [],
    isLoadingSuggestions: false,
  });
  const location = useLocation();
  const { data } = useApmPluginContext().plugins;

  const { urlParams } = useUrlParams();

  const { indexPattern, boolFilter, placeholder } = props;

  let currentRequestCheck;

  async function onChange(inputValue: string, selectionStart: number) {
    if (indexPattern == null) {
      return;
    }

    setState({ ...state, suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    currentRequestCheck = currentRequest;

    try {
      const suggestions = (
        (await data.autocomplete.getQuerySuggestions({
          language: 'kuery',
          indexPatterns: [indexPattern],
          boolFilter: boolFilter || [],
          query: inputValue,
          selectionStart,
          selectionEnd: selectionStart,
          useTimeRange: true,
        })) || []
      ).slice(0, 15);

      if (currentRequest !== currentRequestCheck) {
        return;
      }

      setState({ ...state, suggestions, isLoadingSuggestions: false });
    } catch (e) {
      console.error('Error while fetching suggestions', e);
    }
  }

  function onSubmit(inputValue: string) {
    if (indexPattern == null) {
      return;
    }

    try {
      const res = convertKueryToEsQuery(inputValue, indexPattern);
      if (!res) {
        return;
      }

      history.push({
        ...location,
        search: fromQuery({
          ...toQuery(location.search),
          kuery: encodeURIComponent(inputValue.trim()),
        }),
      });
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  }

  return (
    <Container>
      <Typeahead
        isLoading={state.isLoadingSuggestions}
        initialValue={urlParams.kuery}
        onChange={onChange}
        onSubmit={onSubmit}
        suggestions={state.suggestions}
        placeholder={placeholder}
      />
    </Container>
  );
}
