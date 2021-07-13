/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { IndexPattern } from 'src/plugins/data/public';
import { usePluginContext } from '../../hooks/use_plugin_context';

export const useIndexPatterns = (index: string[]) => {
  const {
    plugins: {
      data: { indexPatterns },
    },
  } = usePluginContext();

  const joined = index.join(',');

  const [patterns, setPatterns] = useState<IndexPattern[]>([]);

  useEffect(() => {
    if (!joined) {
      setPatterns([]);
      return;
    }

    Promise.all(
      joined.split(',').map((i) => {
        return indexPatterns
          .getFieldsForIndexPattern({
            title: i,
            allowNoIndex: true,
            timeFieldName: '@timestamp',
          })
          .then((fields) => {
            return {
              title: i,
              timeFieldName: '@timestamp',
              fields,
            };
          });
      })
    )
      .then((fetchedPatterns) => {
        setPatterns(fetchedPatterns);
      })
      .catch((err) => {
        console.error(err);
        setPatterns([]);
      });
  }, [joined, indexPatterns]);

  return {
    indexPatterns: patterns,
  };
};
