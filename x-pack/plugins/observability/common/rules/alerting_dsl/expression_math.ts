/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as math from 'mathjs';

const expressionMath: typeof math = math.create(math.all) as any;

(expressionMath.typed as any).conversions.unshift({
  from: 'null',
  to: 'number',
  convert: () => 0,
});

export { expressionMath };
