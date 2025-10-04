/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeFlagOptions, type Command } from '@kbn/dev-cli-runner';
import { createProfileFromTraces } from '@kbn/profiler';
import { clientFlags, createClientsFromFlags, toolingLogToLogger } from '@kbn/kibana-api-cli';
import datemath from '@elastic/datemath';
import { MAX_DOCS_PER_REQUEST } from '@kbn/profiler';
import type { FromTracesCliFlags } from './flags';

export const fromTracesCommand: Command<{}, FromTracesCliFlags> = {
  name: 'traces',
  description: 'Create a profile from APM spans',
  async run({ flags, log, addCleanupTask }) {
    const controller = new AbortController();

    const clients = createClientsFromFlags({ flags, signal: controller.signal });

    addCleanupTask(() => {
      controller.abort();
    });

    const start = datemath.parse(flags.from ?? 'now-15m')!.valueOf();
    const end = datemath.parse(flags.to ?? 'now')!.valueOf();

    const logger = toolingLogToLogger({ log, flags });

    await createProfileFromTraces({
      start,
      end,
      esClient: clients.asCurrentUser,
      logger,
      kql: flags.kql,
      eventsKql: flags['events-kql'],
      maxDocs: flags['max-docs'] ? Number(flags['max-docs']) : undefined,
      signal: controller.signal,
    });
  },
  flags: mergeFlagOptions(clientFlags, {
    string: ['from', 'to', 'kql', 'max-docs', 'events-kql'],
    help: `
    --from            The start of the time range, in Elastic datemath or ISO
    --to              The end of the time range, in Elastic datemath or ISO
    --kql             The KQL filter to apply when getting trace ids
    --events-kql      The KQL filter to apply when getting trace events for the collected trace ids
    --max-docs        The max number of docs, defaults to ${MAX_DOCS_PER_REQUEST}
    `,
  }),
};
