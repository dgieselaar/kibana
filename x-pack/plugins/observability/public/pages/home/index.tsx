/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { useHasData } from '../../hooks/use_has_data';
import { LoadingObservability } from './loading_observability';

export function HomePage() {
  const history = useHistory();

  const { hasData } = useHasData();

  useEffect(() => {
    const hasAnyData = Object.values(hasData).some(({ data }) => data === true);

    const isAllLoaded = Object.values(hasData).every(
      ({ status }) => status !== FETCH_STATUS.LOADING
    );

    if (hasAnyData) {
      history.push({ pathname: '/overview' });
    } else if (!hasAnyData && isAllLoaded) {
      history.push({ pathname: '/landing' });
    }
  }, [hasData, history]);

  return <LoadingObservability />;
}
