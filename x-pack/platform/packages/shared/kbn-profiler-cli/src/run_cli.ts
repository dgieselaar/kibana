/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunWithCommands, run } from '@kbn/dev-cli-runner';
import { omit } from 'lodash';
import { profileCommand } from './commands/profile/profile_command';
import { fromTracesCommand } from './commands/from_traces/from_traces_command';

export async function cli(command?: 'profile' | 'traces') {
  if (command === 'profile') {
    await run(profileCommand.run, omit(profileCommand, 'run'));
  } else if (command === 'traces') {
    await run(fromTracesCommand.run, omit(fromTracesCommand, 'run'));
  } else {
    await new RunWithCommands<{}>({
      description: 'Profiler CLI',
    })
      .command(profileCommand)
      .command(fromTracesCommand)
      .execute();
  }
}
