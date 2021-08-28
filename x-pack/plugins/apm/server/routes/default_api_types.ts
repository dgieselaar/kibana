/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';

export { environmentRt } from '../../common/environment_rt';

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});

export const offsetRt = t.partial({ offset: t.string });

export const comparisonRangeRt = t.partial({
  comparisonStart: isoToEpochRt,
  comparisonEnd: isoToEpochRt,
});

export const kueryRt = t.type({ kuery: t.string });
