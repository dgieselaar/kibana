/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange } from '..';
import { ApmFields } from '../lib/apm/apm_fields';
import { Scenario } from '../scripts/scenario';
import { RunOptions } from '../scripts/utils/parse_run_cli_flags';

const scenario: Scenario<ApmFields> = async (runOptions: RunOptions) => {
  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const instance = apm.service('my-service', 'production', 'java').instance('instance-a');

      return range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return instance
            .transaction('Operation X')
            .timestamp(timestamp)
            .duration(2600)
            .children(
              instance
                .span('Operation A', 'external')
                .timestamp(timestamp + 100)
                .duration(800)
                .children(
                  instance
                    .span('Operation B', 'db')
                    .timestamp(timestamp + 250)
                    .duration(400)
                ),
              instance
                .span('Operation C', 'db')
                .timestamp(timestamp + 200)
                .duration(1000),
              instance
                .span('Operation D', 'db')
                .timestamp(timestamp + 1400)
                .duration(1000)
            );
        });
    },
  };
};

export default scenario;
