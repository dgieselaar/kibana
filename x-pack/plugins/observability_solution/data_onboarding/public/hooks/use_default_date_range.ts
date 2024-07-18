/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from './use_kibana';

function getRangeFromDataPluginStart(data: DataPublicPluginStart) {
  const timeRange = data.query.timefilter.timefilter.getAbsoluteTime();
  return {
    start: new Date(timeRange.from).getTime(),
    end: new Date(timeRange.to).getTime(),
  };
}

interface AbsoluteDateRange {
  start: number;
  end: number;
}

export function useDefaultDateRange(): [
  AbsoluteDateRange,
  React.Dispatch<React.SetStateAction<AbsoluteDateRange>>
] {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const [range, setRange] = useState<{ start: number; end: number }>(() => {
    return getRangeFromDataPluginStart(data);
  });

  useEffect(() => {
    data.query.timefilter.timefilter.getTimeUpdate$().subscribe(() => {
      setRange(() => getRangeFromDataPluginStart(data));
    });
  }, [data]);

  return [range, setRange];
}
