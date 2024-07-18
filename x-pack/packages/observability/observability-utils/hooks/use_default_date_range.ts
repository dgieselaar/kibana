/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function useDefaultDateRange(data: DataPublicPluginStart) {
  const [range, setRange] = useState<{ start: number; end: number }>(() => {
    return getRangeFromDataPluginStart(data);
  });

  useEffect(() => {
    data.query.timefilter.timefilter.getTimeUpdate$().subscribe(() => {
      setRange(() => getRangeFromDataPluginStart(data));
    });
  }, [data]);
}
